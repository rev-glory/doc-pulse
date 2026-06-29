import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@/database";
import { WorkflowService } from "./services/workflow.service";
import { WorkflowExecutorService } from "./graph/workflow-executor.service";
import { WorkflowNodeAdapters } from "./graph/workflow-node-adapters";
import { WorkflowNodeExecutionWrapper } from "./graph/workflow-node-execution.wrapper";
import { WorkflowCheckpointRepository } from "./persistence/workflow-checkpoint.repository";
import {
  RepositoryAnalyzerNode,
  DocumentationLocatorNode,
  CodebaseAnalyzerNode,
  TechnicalWriterNode,
  DocumentationCriticNode,
  GitCommitNode,
  PushBranchNode,
  CreatePullRequestNode,
  HumanReviewNode,
} from "./nodes";
import { EarlySkipNode } from "./nodes/early-skip.node";
import {
  SKIP_RULES,
  DisabledRepositoryRule,
  CommitMessageSkipRule,
  DocumentationOnlyRule,
  DependencyOnlyRule,
} from "./nodes/early-skip-rules";
import { RepositoryAnalysisModule } from "../repository-analysis/repository-analysis.module";
import { DocumentGenerationModule } from "../document-generation/document-generation.module";
import { DocumentReviewModule } from "../document-review/document-review.module";
import { GitOperationsModule } from "../git-operations/git-operations.module";
import { GitHubModule } from "../github/github.module";
import { SourceCodeAnalysisModule } from "../source-code-analysis/source-code-analysis.module";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RepositoryAnalysisModule,
    DocumentGenerationModule,
    DocumentReviewModule,
    GitOperationsModule,
    GitHubModule,
    SourceCodeAnalysisModule,
  ],
  providers: [
    WorkflowCheckpointRepository,
    WorkflowNodeExecutionWrapper,
    WorkflowService,
    WorkflowExecutorService,
    WorkflowNodeAdapters,
    RepositoryAnalyzerNode,
    EarlySkipNode,
    DocumentationLocatorNode,
    CodebaseAnalyzerNode,
    TechnicalWriterNode,
    DocumentationCriticNode,
    GitCommitNode,
    PushBranchNode,
    CreatePullRequestNode,
    HumanReviewNode,
    DisabledRepositoryRule,
    CommitMessageSkipRule,
    DocumentationOnlyRule,
    DependencyOnlyRule,
    {
      provide: SKIP_RULES,
      useFactory: (r1, r2, r3, r4) => [r1, r2, r3, r4],
      inject: [
        DisabledRepositoryRule,
        CommitMessageSkipRule,
        DocumentationOnlyRule,
        DependencyOnlyRule,
      ],
    },
  ],
  exports: [WorkflowService, WorkflowCheckpointRepository],
})
export class WorkflowModule {}
