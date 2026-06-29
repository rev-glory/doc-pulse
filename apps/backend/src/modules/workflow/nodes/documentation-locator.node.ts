import { Injectable } from '@nestjs/common';
import { WorkflowGraphState, WorkflowExecutionConfig } from '../graph/graph.types';
import { RepositoryAnalysisService } from '../../repository-analysis/services/repository-analysis.service';

@Injectable()
export class DocumentationLocatorNode {
  constructor(private readonly repositoryAnalysisService: RepositoryAnalysisService) {}

  public async invoke(state: WorkflowGraphState, ctx?: WorkflowExecutionConfig): Promise<Partial<WorkflowGraphState>> {
    const rootPath = state.repository?.rootPath || state.workspacePath;
    if (!rootPath) {
      return {};
    }

    const documentation = await this.repositoryAnalysisService.analyzeDocumentation(rootPath, ctx?.documentationDirectory);

    return {
      documentation,
      // Store previously generated documentation as a separate channel so TechnicalWriterNode
      // can supply it to the LLM as reference context without mixing it with developer docs.
      previousGeneratedDocumentation: documentation.previousGeneratedDocumentation,
    };
  }
}
