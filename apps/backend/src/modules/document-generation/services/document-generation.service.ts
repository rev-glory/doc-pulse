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
import { GeneratedDocument, GeneratedDocumentType } from '../../../domain/workflow';
import { README_PROMPT_TEMPLATE } from '../prompts/readme.prompt';
import { INSTALLATION_PROMPT_TEMPLATE } from '../prompts/installation.prompt';
import { ARCHITECTURE_PROMPT_TEMPLATE } from '../prompts/architecture.prompt';

@Injectable()
export class DocumentGenerationService {
  private readonly logger = new Logger(DocumentGenerationService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly promptTemplateService: PromptTemplateService,
  ) {}

  public async generateDocuments(
    repository: RepositorySummary,
    documentation: DocumentationInventory,
  ): Promise<GeneratedDocument[]> {
    this.logger.log(`Starting document generation for repository: ${repository?.name}`);

    if (!repository || !repository.name) {
      throw new BadRequestException('Invalid repository summary provided to DocumentGenerationService');
    }

    if (!documentation) {
      throw new BadRequestException('Missing documentation inventory in DocumentGenerationService');
    }

    const existingDocsSummary = documentation.documentationFiles
      ? documentation.documentationFiles.map((f) => f.path).join(', ')
      : 'None';

    try {
      // Compile prompts
      const [readmePrompt, installationPrompt, architecturePrompt] = await Promise.all([
        this.promptTemplateService.compile(README_PROMPT_TEMPLATE, {
          overview: `A project built with ${repository.languages.join(', ')}`,
          technologies: [...repository.languages, ...repository.frameworks, ...repository.buildTools].join(', '),
          structure: repository.workspaceFolders.join(', ') || 'Standard root layout',
          existingDocs: existingDocsSummary,
        }),
        this.promptTemplateService.compile(INSTALLATION_PROMPT_TEMPLATE, {
          frameworks: repository.frameworks.join(', ') || 'None',
          scripts: Object.entries(repository.scripts || {}).map(([k, v]) => `${k}: ${v}`).join('\n') || 'None',
          setup_instructions: repository.packageManager
            ? `Run ${repository.packageManager} install`
            : 'No package manager found',
          existingDocs: existingDocsSummary,
        }),
        this.promptTemplateService.compile(ARCHITECTURE_PROMPT_TEMPLATE, {
          structure: repository.workspaceFolders.join(', ') || 'Standard monolithic structure',
          modules: 'N/A',
          technologies: repository.dependencies.map((d) => d.name).slice(0, 10).join(', ') || 'None',
          workspace_layout: repository.workspaceType || 'Standard',
          existingDocs: existingDocsSummary,
        }),
      ]);

      // Execute LLM generations in parallel
      const [readmeResponse, installationResponse, architectureResponse] = await Promise.all([
        this.llmService.generateText({ prompt: readmePrompt }),
        this.llmService.generateText({ prompt: installationPrompt }),
        this.llmService.generateText({ prompt: architecturePrompt }),
      ]);

      return [
        {
          id: crypto.randomUUID(),
          title: 'README.md',
          path: 'README.md',
          content: readmeResponse.text,
          type: GeneratedDocumentType.README,
        },
        {
          id: crypto.randomUUID(),
          title: 'INSTALLATION.md',
          path: 'INSTALLATION.md',
          content: installationResponse.text,
          type: GeneratedDocumentType.INSTALLATION,
        },
        {
          id: crypto.randomUUID(),
          title: 'ARCHITECTURE.md',
          path: 'ARCHITECTURE.md',
          content: architectureResponse.text,
          type: GeneratedDocumentType.ARCHITECTURE,
        },
      ];
    } catch (error) {
      this.logger.error('Error during document generation', error instanceof Error ? error.stack : error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Document generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
