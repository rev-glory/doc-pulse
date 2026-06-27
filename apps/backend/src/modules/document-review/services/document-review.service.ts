import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentationInventory } from '../../../domain/documentation';
import { RepositorySummary } from '../../../domain/repository';
import { CriticReview, DocumentationReview, GeneratedDocument } from '../../../domain/workflow';
import { LlmService } from '../../ai/services/llm.service';
import { MarkdownValidatorService } from '../../document-generation/services/markdown-validator.service';
import { OutputParserService } from '../../document-generation/services/output-parser.service';
import { PromptBuilderService } from '../../document-generation/services/prompt-builder.service';
import { RepositoryContextBuilderService } from '../../document-generation/services/repository-context-builder.service';
import { DOCUMENTATION_CRITIC_PROMPT_VERSION } from '../prompts/documentation-critic.prompt';
import { ReviewEvaluatorService } from './review-evaluator.service';
import { DelayedRetryWorkflowError, QueueErrorClassification } from '../../queue/types/queue-errors';

@Injectable()
export class DocumentReviewService {
  private readonly logger = new Logger(DocumentReviewService.name);

  constructor(
    private readonly contextBuilder: RepositoryContextBuilderService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly llmService: LlmService,
    private readonly outputParser: OutputParserService,
    private readonly markdownValidator: MarkdownValidatorService,
    private readonly reviewEvaluator: ReviewEvaluatorService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Orchestrates batch critic evaluations across all generated documents in a single LLM request.
   * Handles partial provider failures via fallback objects and delegates business rules to ReviewEvaluatorService.
   */
  public async reviewDocuments(
    repository: RepositorySummary,
    documentation: DocumentationInventory,
    generatedDocuments: GeneratedDocument[],
    runId: string = 'unknown-run',
    repositoryId?: string,
  ): Promise<CriticReview> {
    const repoIdentifier = repositoryId || (repository as any)?.id || repository?.name || 'unknown-repository';
    this.logger.log(`[${runId}] Reviewing ${generatedDocuments?.length || 0} documents for repository: ${repoIdentifier}`);

    if (!repository || !repository.name) {
      throw new BadRequestException('Invalid repository summary provided to DocumentReviewService');
    }
    if (!documentation) {
      throw new BadRequestException('Missing documentation inventory in DocumentReviewService');
    }
    if (!generatedDocuments || generatedDocuments.length === 0) {
      throw new BadRequestException('No generated documents provided to review');
    }

    // 1. Build deterministic repository context
    const repoContext = this.contextBuilder.buildContext({ repository, documentation } as any);
    const configuredModel = this.configService.get<string>('gemini.model') ?? 'gemini-2.5-flash';
    const startTime = Date.now();

    // 2. Evaluate all documents in one batch request
    const compiledPrompt = await this.promptBuilder.buildBatchCriticPrompt(generatedDocuments, repoContext);

    let rawOutputMap: Record<string, any> = {};
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let durationMs = 0;

    try {
      const llmResponse = await this.llmService.generateStructured({
        prompt: compiledPrompt.userPrompt,
        systemInstruction: compiledPrompt.systemPrompt,
        responseSchema: compiledPrompt.responseSchema,
      });
      durationMs = Date.now() - startTime;
      usage = llmResponse.usage ?? usage;
      rawOutputMap = this.outputParser.parseBatchCriticReview(llmResponse.text);
    } catch (error: unknown) {
      if (
        error instanceof DelayedRetryWorkflowError ||
        (error as any)?.delayMs ||
        (error as any)?.classification === QueueErrorClassification.TRANSIENT
      ) {
        throw error;
      }
      durationMs = Date.now() - startTime;
      this.logger.error(
        `[${runId}] Batch review evaluation failed for repository [${repoIdentifier}]: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    const completedReviews: DocumentationReview[] = generatedDocuments.map((doc) => {
      const docTypeKey = doc.type.toUpperCase();
      const rawOutput = rawOutputMap[docTypeKey];

      const perDocMetrics = {
        promptVersion: DOCUMENTATION_CRITIC_PROMPT_VERSION,
        model: configuredModel,
        reviewDurationMs: Math.round(durationMs / generatedDocuments.length),
        promptTokens: Math.round(usage.promptTokens / generatedDocuments.length),
        completionTokens: Math.round(usage.completionTokens / generatedDocuments.length),
        totalTokens: Math.round(usage.totalTokens / generatedDocuments.length),
        reviewedAt: new Date().toISOString(),
      };

      if (!rawOutput) {
        return {
          documentType: doc.type,
          score: 0,
          approved: false,
          issues: [
            {
              severity: 'CRITICAL',
              category: 'System Error',
              message: `Automated critic evaluation missing or failed in batch response for ${doc.type}`,
            },
          ],
          suggestions: ['Regenerate document due to review subsystem exception'],
          metrics: perDocMetrics,
        };
      }

      const validationResult = this.markdownValidator.validate(doc.markdown);
      const reviewResult = this.reviewEvaluator.evaluate(rawOutput, validationResult, doc.type, perDocMetrics);

      this.logger.log(
        JSON.stringify({
          event: 'document_review_completed',
          runId,
          repositoryId: repoIdentifier,
          documentType: doc.type,
          score: reviewResult.score,
          approved: reviewResult.approved,
          durationMs: perDocMetrics.reviewDurationMs,
          metrics: perDocMetrics,
        }),
      );

      return reviewResult;
    });

    // 3. Aggregate consolidated statistical summary
    const aggregatedReview = this.reviewEvaluator.aggregate(completedReviews);

    this.logger.log(
      `[${runId}] Multi-agent critic review completed. AverageScore: ${aggregatedReview.score}, Approved: ${aggregatedReview.approvedCount}/${aggregatedReview.totalDocuments}, Passed: ${aggregatedReview.passed}`,
    );

    return aggregatedReview;
  }
}

