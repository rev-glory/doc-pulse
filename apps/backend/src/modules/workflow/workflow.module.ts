import { Module } from '@nestjs/common';
import { WorkflowService } from './services/workflow.service';
import { RepositoryAnalyzerNode } from './nodes/repository-analyzer.node';
import { DocumentationLocatorNode } from './nodes/documentation-locator.node';
import { RepositoryAnalysisModule } from '../repository-analysis/repository-analysis.module';

@Module({
  imports: [RepositoryAnalysisModule],
  providers: [
    WorkflowService,
    RepositoryAnalyzerNode,
    DocumentationLocatorNode,
  ],
  exports: [WorkflowService],
})
export class WorkflowModule {}
