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
   * Orchestrates independent multi-agent critic evaluations across all generated documents.
   * Handles partial provider failures via fallback objects and delegates business rules to ReviewEvaluatorService.
   */
  public async reviewDocuments(
    repository: RepositorySummary,
    documentation: DocumentationInventory,
    generatedDocuments: GeneratedDocument[],
    runId: string = 'unknown-run',
  ): Promise<CriticReview> {
    this.logger.log(`[${runId}] Starting multi-agent documentation critic review for repository [${repository?.name}]`);

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

    // 2. Evaluate each document independently using Promise.allSettled
    const reviewPromises = generatedDocuments.map(async (doc): Promise<DocumentationReview> => {
      const startTime = Date.now();
      try {
        // Assemble versioned prompt
        const compiledPrompt = await this.promptBuilder.buildCriticPrompt(doc, repoContext);

        // Generate structured evaluation
        const llmResponse = await this.llmService.generateStructured({
          prompt: compiledPrompt.userPrompt,
          systemInstruction: compiledPrompt.systemPrompt,
          responseSchema: compiledPrompt.responseSchema,
        });

        const durationMs = Date.now() - startTime;
        const usage = llmResponse.usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

        // Parse structured JSON output
        const rawOutput = this.outputParser.parseCriticReview(llmResponse.text, doc.type);

        // Diagnose Markdown syntax structure
        const validationResult = this.markdownValidator.validate(doc.markdown);

        // Apply threshold and scoring business logic
        const metrics = {
          promptVersion: DOCUMENTATION_CRITIC_PROMPT_VERSION,
          model: configuredModel,
          reviewDurationMs: durationMs,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          reviewedAt: new Date().toISOString(),
        };

        const reviewResult = this.reviewEvaluator.evaluate(rawOutput, validationResult, doc.type, metrics);

        this.logger.log(
          JSON.stringify({
            event: 'document_review_completed',
            runId,
            repositoryId: (repository as any).id ?? repository.name,
            documentType: doc.type,
            score: reviewResult.score,
            approved: reviewResult.approved,
            durationMs,
            metrics,
          }),
        );

        return reviewResult;
      } catch (error) {
        const durationMs = Date.now() - startTime;
        this.logger.error(
          `[${runId}] Independent review evaluation failed for document [${doc.type}]: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        // Return fallback failed review object so partial failures never crash the workflow
        return {
          documentType: doc.type,
          score: 0,
          approved: false,
          issues: [
            {
              severity: 'CRITICAL',
              category: 'System Error',
              message: `Automated critic evaluation failed: ${error instanceof Error ? error.message : 'Timeout or unparseable output'}`,
            },
          ],
          suggestions: ['Regenerate document due to review subsystem exception'],
          metrics: {
            promptVersion: DOCUMENTATION_CRITIC_PROMPT_VERSION,
            model: 'fallback-error-handler',
            reviewDurationMs: durationMs,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            reviewedAt: new Date().toISOString(),
          },
        };
      }
    });

    const settledResults = await Promise.allSettled(reviewPromises);
    const completedReviews = settledResults.map((res, idx) => {
      if (res.status === 'fulfilled') {
        return res.value;
      }
      const doc = generatedDocuments[idx]!;
      return {
        documentType: doc.type,
        score: 0,
        approved: false,
        issues: [
          {
            severity: 'CRITICAL' as const,
            category: 'System Error',
            message: `Promise rejection during evaluation: ${res.reason?.message ?? res.reason}`,
          },
        ],
        suggestions: ['Regenerate document'],
        metrics: {
          promptVersion: DOCUMENTATION_CRITIC_PROMPT_VERSION,
          model: 'unhandled-rejection-fallback',
          reviewDurationMs: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          reviewedAt: new Date().toISOString(),
        },
      };
    });

    // 3. Aggregate consolidated statistical summary
    const aggregatedReview = this.reviewEvaluator.aggregate(completedReviews);

    this.logger.log(
      `[${runId}] Multi-agent critic review completed. AverageScore: ${aggregatedReview.score}, Approved: ${aggregatedReview.approvedCount}/${aggregatedReview.totalDocuments}, Passed: ${aggregatedReview.passed}`,
    );

    return aggregatedReview;
  }
}
