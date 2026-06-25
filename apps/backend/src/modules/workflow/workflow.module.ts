import { Module } from '@nestjs/common';
import { WorkflowService } from './services/workflow.service';
import { RepositoryAnalyzerNode } from './nodes/repository-analyzer.node';
import { DocumentationLocatorNode } from './nodes/documentation-locator.node';
import { TechnicalWriterNode } from './nodes/technical-writer.node';
import { RepositoryAnalysisModule } from '../repository-analysis/repository-analysis.module';
import { DocumentGenerationModule } from '../document-generation/document-generation.module';

@Module({
  imports: [RepositoryAnalysisModule, DocumentGenerationModule],
  providers: [
    WorkflowService,
    RepositoryAnalyzerNode,
    DocumentationLocatorNode,
    TechnicalWriterNode,
  ],
  exports: [WorkflowService],
})
export class WorkflowModule {}
