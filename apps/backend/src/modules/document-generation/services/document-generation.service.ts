import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmService } from '../../ai/services/llm.service';
import { GeneratedDocument, GeneratedDocumentType, WorkflowState } from '../../../domain/workflow';
import { RepositoryContextBuilderService } from './repository-context-builder.service';
import { PromptBuilderService } from './prompt-builder.service';
import { OutputParserService } from './output-parser.service';
import { MarkdownValidatorService } from './markdown-validator.service';

@Injectable()
export class DocumentGenerationService {
  private readonly logger = new Logger(DocumentGenerationService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly contextBuilder: RepositoryContextBuilderService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly outputParser: OutputParserService,
    private readonly markdownValidator: MarkdownValidatorService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Orchestrates the Technical Writer pipeline across the 6 canonical document types.
   * Implements bounded concurrency, prompt versioning, structured output parsing,
   * diagnostic validation, structured JSON logging, and generation metrics persistence.
   */
  public async generateDocuments(
    arg1: WorkflowState | any,
    arg2?: any,
  ): Promise<GeneratedDocument[]> {
    const state: WorkflowState =
      arg2 === undefined && arg1 && typeof arg1 === 'object' && 'repository' in arg1
        ? arg1
        : { repository: arg1, documentation: arg2 };

    const workflowId = state.runId ?? 'unknown-run';
    const repositoryId = state.repositoryId ?? state.repository?.name ?? 'unknown-repo';

    this.logger.log('Initiating bounded concurrent document generation', {
      workflowId,
      repositoryId,
      stage: 'WRITING_START',
    });

    if (!state.repository || !state.repository.name) {
      throw new BadRequestException('Invalid repository summary provided to DocumentGenerationService');
    }

    if (!state.documentation) {
      throw new BadRequestException('Missing documentation inventory in DocumentGenerationService');
    }

    try {
      const context = this.contextBuilder.buildContext(state);

      const orderedTypes = [
        GeneratedDocumentType.README,
        GeneratedDocumentType.ARCHITECTURE,
        GeneratedDocumentType.API,
        GeneratedDocumentType.INSTALLATION,
        GeneratedDocumentType.CONTRIBUTING,
        GeneratedDocumentType.DEPLOYMENT,
      ];

      const concurrencyLimit = Number(this.configService.get('DOC_GEN_CONCURRENCY', 2));

      const tasks = orderedTypes.map((docType) => async () => {
        return this.generateSingleDocument(docType, context, workflowId, repositoryId);
      });

      const generatedDocs = await this.executeBoundedPool(tasks, concurrencyLimit);

      this.logger.log('Document generation pipeline finished successfully', {
        workflowId,
        repositoryId,
        documentCount: generatedDocs.length,
      });

      return generatedDocs;
    } catch (error: unknown) {
      this.logger.error('Document generation pipeline failed permanently', {
        workflowId,
        repositoryId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Document generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async generateSingleDocument(
    documentType: GeneratedDocumentType,
    context: ReturnType<RepositoryContextBuilderService['buildContext']>,
    workflowId: string,
    repositoryId: string,
  ): Promise<GeneratedDocument> {
    const startTime = Date.now();

    const compiledPrompt = await this.promptBuilder.buildPrompt(documentType, context);
    const configuredModel = this.configService.get<string>('gemini.model') ?? 'gemini-2.5-flash';

    const llmResponse = await this.llmService.generateStructured({
      prompt: compiledPrompt.userPrompt,
      systemInstruction: compiledPrompt.systemPrompt,
      responseSchema: compiledPrompt.responseSchema,
      temperature: 0.2,
    });

    const durationMs = Date.now() - startTime;
    const usage = llmResponse.usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    const metrics = {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      generationDurationMs: durationMs,
      promptVersion: compiledPrompt.promptVersion,
      model: configuredModel,
    };

    const parsedDocument = this.outputParser.parse(llmResponse.text, documentType, metrics);

    const validationResult = this.markdownValidator.validate(parsedDocument.markdown);

    this.logger.log('Document generated and validated', {
      workflowId,
      repositoryId,
      documentType,
      promptVersion: compiledPrompt.promptVersion,
      model: configuredModel,
      durationMs,
      tokenUsage: usage,
      validation: {
        valid: validationResult.valid,
        warnings: validationResult.warnings.length,
        errors: validationResult.errors.length,
      },
    });

    if (!validationResult.valid) {
      this.logger.warn(`Markdown validation flagged errors for ${documentType}`, {
        workflowId,
        repositoryId,
        errors: validationResult.errors,
      });
    }

    return parsedDocument;
  }

  private async executeBoundedPool<T>(
    tasks: (() => Promise<T>)[],
    concurrencyLimit: number,
  ): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < tasks.length; i += concurrencyLimit) {
      const chunk = tasks.slice(i, i + concurrencyLimit);
      const chunkResults = await Promise.all(chunk.map((fn) => fn()));
      results.push(...chunkResults);
    }
    return results;
  }
}
