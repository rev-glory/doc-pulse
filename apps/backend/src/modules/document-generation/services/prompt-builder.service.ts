import { Injectable, Logger } from '@nestjs/common';
import { PromptTemplateService } from '../../ai/services/prompt-template.service';
import { GeneratedDocumentType } from '../../../domain/workflow';
import type { RepositoryGenerationContext } from './repository-context-builder.service';
import {
  TECHNICAL_WRITER_PROMPT_VERSION,
  TECHNICAL_WRITER_SYSTEM_PROMPT,
  TECHNICAL_WRITER_USER_PROMPT_TEMPLATE,
  DOCUMENT_TYPE_GUIDELINES,
  DOCUMENT_OUTPUT_SCHEMA,
} from '../prompts/technical-writer.prompt';

export interface CompiledDocumentPrompt {
  systemPrompt: string;
  userPrompt: string;
  promptVersion: number;
  responseSchema: Record<string, unknown>;
}

@Injectable()
export class PromptBuilderService {
  private readonly logger = new Logger(PromptBuilderService.name);

  constructor(private readonly promptTemplateService: PromptTemplateService) {}

  /**
   * Assembles system and user prompt strings isolated from generation business logic.
   * Records prompt versioning and interpolates deterministic repository context.
   */
  public async buildPrompt(
    documentType: GeneratedDocumentType,
    context: RepositoryGenerationContext,
  ): Promise<CompiledDocumentPrompt> {
    this.logger.debug(`Building v${TECHNICAL_WRITER_PROMPT_VERSION} prompt for [${documentType}]`);

    const documentGuidelines = DOCUMENT_TYPE_GUIDELINES[documentType] ?? '';

    const userPrompt = await this.promptTemplateService.compile(TECHNICAL_WRITER_USER_PROMPT_TEMPLATE, {
      documentType,
      repositoryName: context.repositoryName,
      repositoryContext: context.formattedSummary,
      documentGuidelines,
    });

    return {
      systemPrompt: TECHNICAL_WRITER_SYSTEM_PROMPT,
      userPrompt,
      promptVersion: TECHNICAL_WRITER_PROMPT_VERSION,
      responseSchema: DOCUMENT_OUTPUT_SCHEMA,
    };
  }
}
