import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/database';
import { WorkflowService } from './services/workflow.service';
import { WorkflowExecutorService } from './graph/workflow-executor.service';
import { WorkflowNodeAdapters } from './graph/workflow-node-adapters';
import { WorkflowNodeExecutionWrapper } from './graph/workflow-node-execution.wrapper';
import { WorkflowCheckpointRepository } from './persistence/workflow-checkpoint.repository';
import { RepositoryAnalyzerNode } from './nodes/repository-analyzer.node';
import { DocumentationLocatorNode } from './nodes/documentation-locator.node';
import { TechnicalWriterNode } from './nodes/technical-writer.node';
import { DocumentationCriticNode } from './nodes/documentation-critic.node';
import { RepositoryAnalysisModule } from '../repository-analysis/repository-analysis.module';
import { DocumentGenerationModule } from '../document-generation/document-generation.module';
import { DocumentReviewModule } from '../document-review/document-review.module';

@Module({
  imports: [ConfigModule, PrismaModule, RepositoryAnalysisModule, DocumentGenerationModule, DocumentReviewModule],
  providers: [
    WorkflowCheckpointRepository,
    WorkflowNodeExecutionWrapper,
    WorkflowService,
    WorkflowExecutorService,
    WorkflowNodeAdapters,
    RepositoryAnalyzerNode,
    DocumentationLocatorNode,
    TechnicalWriterNode,
    DocumentationCriticNode,
  ],
  exports: [WorkflowService, WorkflowExecutorService, WorkflowCheckpointRepository],
})
export class WorkflowModule {}
