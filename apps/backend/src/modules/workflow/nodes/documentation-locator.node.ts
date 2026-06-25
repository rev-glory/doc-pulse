import { Injectable } from '@nestjs/common';
import { WorkflowAnnotation } from '../graph/state.annotation';
import { RepositoryAnalysisService } from '../../repository-analysis/services/repository-analysis.service';

@Injectable()
export class DocumentationLocatorNode {
  constructor(private readonly repositoryAnalysisService: RepositoryAnalysisService) {}

  public async invoke(state: typeof WorkflowAnnotation.State): Promise<Partial<typeof WorkflowAnnotation.State>> {
    if (!state.repository?.rootPath) {
      return state;
    }

    const documentation = await this.repositoryAnalysisService.analyzeDocumentation(state.repository.rootPath);
    
    return {
      ...state,
      documentation,
    };
  }
}

