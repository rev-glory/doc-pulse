import { Injectable } from '@nestjs/common';
import { WorkflowGraphState } from '../graph/graph.types';
import { RepositoryAnalysisService } from '../../repository-analysis/services/repository-analysis.service';

@Injectable()
export class DocumentationLocatorNode {
  constructor(private readonly repositoryAnalysisService: RepositoryAnalysisService) {}

  public async invoke(state: WorkflowGraphState): Promise<Partial<WorkflowGraphState>> {
    const rootPath = state.repository?.rootPath || state.workspacePath;
    if (!rootPath) {
      return {};
    }

    const documentation = await this.repositoryAnalysisService.analyzeDocumentation(rootPath);
    
    return {
      documentation,
    };
  }
}

