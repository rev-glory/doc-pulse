import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { DocumentGenerationService } from './services/document-generation.service';
import { RepositoryContextBuilderService } from './services/repository-context-builder.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { OutputParserService } from './services/output-parser.service';
import { MarkdownValidatorService } from './services/markdown-validator.service';

@Module({
  imports: [AiModule],
  providers: [
    DocumentGenerationService,
    RepositoryContextBuilderService,
    PromptBuilderService,
    OutputParserService,
    MarkdownValidatorService,
  ],
  exports: [
    DocumentGenerationService,
    RepositoryContextBuilderService,
    PromptBuilderService,
    OutputParserService,
    MarkdownValidatorService,
  ],
})
export class DocumentGenerationModule {}
