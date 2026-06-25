import { Module } from '@nestjs/common';
import { WorkflowService } from './services/workflow.service';
import { RepositoryAnalyzerNode } from './nodes/repository-analyzer.node';
import { DocumentationLocatorNode } from './nodes/documentation-locator.node';
import { TechnicalWriterNode } from './nodes/technical-writer.node';
import { DocumentationCriticNode } from './nodes/documentation-critic.node';
import { RepositoryAnalysisModule } from '../repository-analysis/repository-analysis.module';
import { DocumentGenerationModule } from '../document-generation/document-generation.module';
import { DocumentReviewModule } from '../document-review/document-review.module';

@Module({
  imports: [RepositoryAnalysisModule, DocumentGenerationModule, DocumentReviewModule],
  providers: [
    WorkflowService,
    RepositoryAnalyzerNode,
    DocumentationLocatorNode,
    TechnicalWriterNode,
    DocumentationCriticNode,
  ],
  exports: [WorkflowService],
})
export class WorkflowModule {}
