import { Injectable } from '@nestjs/common';
import { WorkflowAnnotation } from '../graph/state.annotation';
import { RepositoryAnalysisService } from '../../repository-analysis/services/repository-analysis.service';

@Injectable()
export class RepositoryAnalyzerNode {
  constructor(private readonly repositoryAnalysisService: RepositoryAnalysisService) {}

  public async invoke(state: typeof WorkflowAnnotation.State): Promise<Partial<typeof WorkflowAnnotation.State>> {
    // TODO: In a future commit, invoke this.repositoryAnalysisService.analyzeRepository(state.repository.rootPath)
    // and update the repository summary state.
    // For now, we just pass the state through unmodified.
    
    return state;
  }
}
