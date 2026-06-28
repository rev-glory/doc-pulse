import { Injectable, Logger } from '@nestjs/common';
import { PromptTemplateService } from '../../ai/services/prompt-template.service';
import { GeneratedDocument, GeneratedDocumentType } from '../../../domain/workflow';
import type { RepositoryGenerationContext } from './repository-context-builder.service';
import {
  TECHNICAL_WRITER_PROMPT_VERSION,
  TECHNICAL_WRITER_SYSTEM_PROMPT,
  TECHNICAL_WRITER_USER_PROMPT_TEMPLATE,
  DOCUMENT_TYPE_GUIDELINES,
  DOCUMENT_OUTPUT_SCHEMA,
} from '../prompts/technical-writer.prompt';
import {
  DOCUMENTATION_CRITIC_PROMPT_VERSION,
  DOCUMENTATION_CRITIC_SYSTEM_PROMPT,
  DOCUMENTATION_CRITIC_USER_PROMPT_TEMPLATE,
  DOCUMENTATION_CRITIC_SCHEMA,
  BATCH_DOCUMENTATION_CRITIC_USER_PROMPT_TEMPLATE,
  BATCH_DOCUMENTATION_CRITIC_SCHEMA,
} from '../../document-review/prompts/documentation-critic.prompt';

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
   * Compiles domain prompt templates with populated repository context and document guidelines.
   */
  public async buildPrompt(
    documentType: GeneratedDocumentType,
    context: RepositoryGenerationContext,
  ): Promise<CompiledDocumentPrompt> {
    this.logger.debug(`Building v${TECHNICAL_WRITER_PROMPT_VERSION} prompt for [${documentType}]`);

    const documentGuidelines = DOCUMENT_TYPE_GUIDELINES[documentType] ?? '';

    let userPrompt = await this.promptTemplateService.compile(TECHNICAL_WRITER_USER_PROMPT_TEMPLATE, {
      documentType,
      repositoryName: context.repositoryName,
      repositoryContext: context.formattedSummary,
      documentGuidelines,
    });

    if (context.formattedSourceAnalysis) {
      userPrompt += `\n\n## Discovered Source Code Implementation Context\n` +
        `This section contains key structural details extracted from static codebase analysis. Use this implementation context as the primary source of truth to ensure the generated documentation is technically accurate:\n\n` +
        context.formattedSourceAnalysis;
    }

    // Format iteration details
    const iterationText = `Generation Iteration: ${context.generationIteration}\n` +
      (context.generationIteration > 1
        ? `This documentation has been regenerated ${context.generationIteration - 1} time(s).\n`
        : '');

    // Append AI criticism / human feedback if present in context
    const feedbackParts: string[] = [];

    if (context.criticFeedback) {
      // Filter issues/suggestions relevant to the current document type to make prompt highly specific
      const relevantWeaknesses = (context.criticFeedback.weaknesses ?? [])
        .filter((fb) => fb.includes(`[${documentType}]`))
        .map((fb) => fb.replace(`[${documentType}]`, '').trim());

      const relevantSuggestions = (context.criticFeedback.suggestions ?? [])
        .filter((fb) => fb.includes(`[${documentType}]`))
        .map((fb) => fb.replace(`[${documentType}]`, '').trim());

      if (relevantWeaknesses.length > 0 || relevantSuggestions.length > 0) {
        let aiReviewText = `Previous AI Review\n\nOverall Score: ${context.criticFeedback.overallScore}\n`;
        if (relevantWeaknesses.length > 0) {
          aiReviewText += `\nWeaknesses\n` + relevantWeaknesses.map((w) => `- ${w}`).join('\n');
        }
        if (relevantSuggestions.length > 0) {
          aiReviewText += `\n\nSuggestions\n` + relevantSuggestions.map((s) => `- ${s}`).join('\n');
        }
        feedbackParts.push(aiReviewText);
      }
    }

    if (context.humanReviewFeedback) {
      feedbackParts.push(
        `Reviewer Feedback\n"${context.humanReviewFeedback}"`
      );
    }

    // Wrap the iteration and feedback instructions
    let refinementContext = `\n\n## Refinement Context\n${iterationText}`;
    if (feedbackParts.length > 0) {
      refinementContext += `\nPlease improve the document using the following feedback from the previous iteration:\n\n` +
        feedbackParts.join('\n\n');
    }

    // Append refinement context to user prompt if we have feedback or iteration meta
    userPrompt += refinementContext;

    return {
      systemPrompt: TECHNICAL_WRITER_SYSTEM_PROMPT,
      userPrompt,
      promptVersion: TECHNICAL_WRITER_PROMPT_VERSION,
      responseSchema: DOCUMENT_OUTPUT_SCHEMA,
    };
  }

  /**
   * Assembles versioned system and user prompt strings for evaluating an individual generated document.
   */
  public async buildCriticPrompt(
    document: GeneratedDocument,
    context: RepositoryGenerationContext,
  ): Promise<CompiledDocumentPrompt> {
    this.logger.debug(`Building v${DOCUMENTATION_CRITIC_PROMPT_VERSION} critic prompt for [${document.type}]`);

    const documentGuidelines = DOCUMENT_TYPE_GUIDELINES[document.type] ?? '';

    const userPrompt = await this.promptTemplateService.compile(DOCUMENTATION_CRITIC_USER_PROMPT_TEMPLATE, {
      documentType: document.type,
      repositoryName: context.repositoryName,
      repositoryContext: context.formattedSummary,
      documentGuidelines,
      documentMarkdown: document.markdown,
    });

    return {
      systemPrompt: DOCUMENTATION_CRITIC_SYSTEM_PROMPT,
      userPrompt,
      promptVersion: DOCUMENTATION_CRITIC_PROMPT_VERSION,
      responseSchema: DOCUMENTATION_CRITIC_SCHEMA,
    };
  }

  /**
   * Assembles versioned system and user prompt strings for evaluating all generated documents in a single batch request.
   */
  public async buildBatchCriticPrompt(
    documents: GeneratedDocument[],
    context: RepositoryGenerationContext,
  ): Promise<CompiledDocumentPrompt> {
    this.logger.debug(`Building v${DOCUMENTATION_CRITIC_PROMPT_VERSION} batch critic prompt for ${documents.length} documents`);

    const documentsContent = documents
      .map(
        (doc) =>
          `### Document Type: [${doc.type}]\nPath: ${doc.path}\nGuidelines: ${DOCUMENT_TYPE_GUIDELINES[doc.type] ?? ''}\n\n\`\`\`markdown\n${doc.markdown}\n\`\`\``,
      )
      .join('\n\n---\n\n');

    const userPrompt = await this.promptTemplateService.compile(BATCH_DOCUMENTATION_CRITIC_USER_PROMPT_TEMPLATE, {
      repositoryName: context.repositoryName,
      repositoryContext: context.formattedSummary,
      documentsContent,
    });

    return {
      systemPrompt: DOCUMENTATION_CRITIC_SYSTEM_PROMPT,
      userPrompt,
      promptVersion: DOCUMENTATION_CRITIC_PROMPT_VERSION,
      responseSchema: BATCH_DOCUMENTATION_CRITIC_SCHEMA,
    };
  }
}
