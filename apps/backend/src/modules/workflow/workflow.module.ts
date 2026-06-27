import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/database';
import { WorkflowService } from './services/workflow.service';
import { WorkflowExecutorService } from './graph/workflow-executor.service';
import { WorkflowNodeAdapters } from './graph/workflow-node-adapters';
import { WorkflowNodeExecutionWrapper } from './graph/workflow-node-execution.wrapper';
import { WorkflowCheckpointRepository } from './persistence/workflow-checkpoint.repository';
import {
  RepositoryAnalyzerNode,
  DocumentationLocatorNode,
  TechnicalWriterNode,
  DocumentationCriticNode,
  GitCommitNode,
  PushBranchNode,
  CreatePullRequestNode,
} from './nodes';
import { RepositoryAnalysisModule } from '../repository-analysis/repository-analysis.module';
import { DocumentGenerationModule } from '../document-generation/document-generation.module';
import { DocumentReviewModule } from '../document-review/document-review.module';
import { GitOperationsModule } from '../git-operations/git-operations.module';
import { GitHubModule } from '../github/github.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RepositoryAnalysisModule,
    DocumentGenerationModule,
    DocumentReviewModule,
    GitOperationsModule,
    GitHubModule,
  ],
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
    GitCommitNode,
    PushBranchNode,
    CreatePullRequestNode,
  ],
  exports: [WorkflowService, WorkflowCheckpointRepository],
})
export class WorkflowModule {}
