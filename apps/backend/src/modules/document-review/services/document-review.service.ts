import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { LlmService } from '../../ai/services/llm.service';
import { PromptTemplateService } from '../../ai/services/prompt-template.service';
import { RepositorySummary } from '../../../domain/repository';
import { DocumentationInventory } from '../../../domain/documentation';
import { CriticReview, GeneratedDocument } from '../../../domain/workflow';
import { DOCUMENTATION_REVIEW_PROMPT_TEMPLATE } from '../prompts/documentation-review.prompt';
import { CRITIC_REVIEW_SCHEMA } from '../schemas/critic-review.schema';

@Injectable()
export class DocumentReviewService {
  private readonly logger = new Logger(DocumentReviewService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly promptTemplateService: PromptTemplateService,
  ) {}

  public async reviewDocuments(
    repository: RepositorySummary,
    documentation: DocumentationInventory,
    generatedDocuments: GeneratedDocument[],
  ): Promise<CriticReview> {
    this.logger.log(`Starting documentation critic review for repository: ${repository?.name}`);

    if (!repository || !repository.name) {
      throw new BadRequestException('Invalid repository summary provided to DocumentReviewService');
    }

    if (!documentation) {
      throw new BadRequestException('Missing documentation inventory in DocumentReviewService');
    }

    if (!generatedDocuments || generatedDocuments.length === 0) {
      throw new BadRequestException('No generated documents provided to review');
    }

    const formattedContent = generatedDocuments
      .map((doc) => `--- File: ${doc.path} (${doc.type}) ---\n${doc.content}\n`)
      .join('\n');

    const existingDocsSummary = documentation.documentationFiles
      ? documentation.documentationFiles.map((f) => f.path).join(', ')
      : 'None';

    try {
      const prompt = await this.promptTemplateService.compile(DOCUMENTATION_REVIEW_PROMPT_TEMPLATE, {
        repositoryName: repository.name,
        languages: repository.languages.join(', ') || 'None',
        frameworks: repository.frameworks.join(', ') || 'None',
        workspaceType: repository.workspaceType || 'Standard',
        documentationFiles: existingDocsSummary,
        generatedContent: formattedContent,
      });

      const response = await this.llmService.generateStructured({
        prompt,
        responseSchema: CRITIC_REVIEW_SCHEMA,
      });

      if (!response || !response.text) {
        throw new InternalServerErrorException('LLM returned an empty response during documentation review');
      }

      let parsedReview: CriticReview;
      try {
        parsedReview = JSON.parse(response.text) as CriticReview;
      } catch (parseError) {
        this.logger.error('Failed to parse LLM structured JSON output', response.text);
        throw new InternalServerErrorException('Malformed structured JSON output from LLM provider');
      }

      if (
        typeof parsedReview.score !== 'number' ||
        typeof parsedReview.passed !== 'boolean' ||
        !Array.isArray(parsedReview.issues) ||
        !Array.isArray(parsedReview.suggestions)
      ) {
        throw new InternalServerErrorException('Parsed LLM response does not match expected CriticReview contract');
      }

      this.logger.log(`Documentation review finished. Score: ${parsedReview.score}, Passed: ${parsedReview.passed}`);
      return parsedReview;
    } catch (error) {
      this.logger.error('Error during document review', error instanceof Error ? error.stack : error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Document review failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
