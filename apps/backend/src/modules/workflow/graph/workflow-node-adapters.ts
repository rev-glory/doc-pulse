import { Injectable, Logger } from "@nestjs/common";
import { RepositoryAnalyzerNode } from "../nodes/repository-analyzer.node";
import { EarlySkipNode } from "../nodes/early-skip.node";
import { DocumentationLocatorNode } from "../nodes/documentation-locator.node";
import { CodebaseAnalyzerNode } from "../nodes/codebase-analyzer.node";
import { TechnicalWriterNode } from "../nodes/technical-writer.node";
import { DocumentationCriticNode } from "../nodes/documentation-critic.node";
import { HumanReviewNode } from "../nodes/human-review.node";
import { GitCommitNode } from "../nodes/git-commit.node";
import { PushBranchNode } from "../nodes/push-branch.node";
import { CreatePullRequestNode } from "../nodes/create-pull-request.node";
import {
  WorkflowGraphState,
  WorkflowGraphUpdate,
  WorkflowError,
  WorkflowExecutionConfig,
} from "./graph.types";
import {
  WorkflowNodeExecutionWrapper,
  ExecutionContextRef,
} from "./workflow-node-execution.wrapper";
import {
  WorkflowNodeName,
  WorkflowStage,
  WorkflowStatus,
} from "../../../domain/workflow";

export class WorkflowNodeExecutionException extends Error {
  constructor(
    public readonly node: string,
    public readonly causeError: Error,
    public readonly workflowError: WorkflowError,
  ) {
    super(`Node [${node}] execution failed: ${causeError.message}`);
    this.name = "WorkflowNodeExecutionException";
  }
}

export interface ActiveRunOrchestrationContext
  extends ExecutionContextRef, WorkflowExecutionConfig {
  firstNodeToExecute: WorkflowNodeName;
}

@Injectable()
export class WorkflowNodeAdapters {
  private readonly logger = new Logger(WorkflowNodeAdapters.name);
  private readonly activeContexts = new Map<
    string,
    ActiveRunOrchestrationContext
  >();

  private readonly sequentialOrder: WorkflowNodeName[] = [
    WorkflowNodeName.EarlySkip,
    WorkflowNodeName.RepositoryAnalyzer,
    WorkflowNodeName.DocumentationLocator,
    WorkflowNodeName.CodebaseAnalyzer,
    WorkflowNodeName.TechnicalWriter,
    WorkflowNodeName.DocumentationCritic,
    WorkflowNodeName.GitCommit,
    WorkflowNodeName.PushBranch,
    WorkflowNodeName.CreatePullRequest,
  ];

  constructor(
    private readonly repositoryAnalyzer: RepositoryAnalyzerNode,
    private readonly earlySkip: EarlySkipNode,
    private readonly documentationLocator: DocumentationLocatorNode,
    private readonly codebaseAnalyzer: CodebaseAnalyzerNode,
    private readonly technicalWriter: TechnicalWriterNode,
    private readonly documentationCritic: DocumentationCriticNode,
    private readonly humanReview: HumanReviewNode,
    private readonly gitCommit: GitCommitNode,
    private readonly pushBranch: PushBranchNode,
    private readonly createPullRequest: CreatePullRequestNode,
    private readonly wrapper: WorkflowNodeExecutionWrapper,
  ) {}

  public registerExecutionContext(
    runId: string,
    context: ActiveRunOrchestrationContext,
  ): void {
    this.activeContexts.set(runId, context);
  }

  public clearExecutionContext(runId: string): void {
    this.activeContexts.delete(runId);
  }

  /**
   * Determines if a node should be skipped during recovery because it precedes firstNodeToExecute.
   */
  private shouldSkip(
    runId: string | undefined,
    nodeName: WorkflowNodeName,
    state?: WorkflowGraphState,
  ): boolean {
    if (!runId) return false;
    const context = this.activeContexts.get(runId);
    if (!context) return false;

    // Issue 4: If checkpoint state already contains commitSha and targetBranch, skip GitCommit node
    if (
      nodeName === WorkflowNodeName.GitCommit &&
      state?.commitSha &&
      state?.targetBranch
    ) {
      return true;
    }

    const targetIndex = this.sequentialOrder.indexOf(
      context.firstNodeToExecute,
    );
    const currentIndex = this.sequentialOrder.indexOf(nodeName);

    return currentIndex < targetIndex;
  }

  private getOrchestrationContext(
    runId: string,
  ): ActiveRunOrchestrationContext {
    const ctx = this.activeContexts.get(runId);
    if (!ctx) {
      throw new Error(`Orchestration context missing for run [${runId}]`);
    }
    return ctx;
  }

  public async earlySkipStep(
    state: WorkflowGraphState,
  ): Promise<WorkflowGraphUpdate> {
    const nodeName = WorkflowNodeName.EarlySkip;
    if (this.shouldSkip(state.runId, nodeName, state)) {
      this.logger.debug(
        `[${state.runId}] Skipping node [${nodeName}] (recovery mode)`,
      );
      return { currentNode: nodeName, executionStatus: WorkflowStatus.Running };
    }

    const ctx = this.getOrchestrationContext(state.runId);
    return this.wrapper.executeNode(
      nodeName,
      WorkflowStage.EARLY_SKIP,
      state,
      ctx,
      async (st) => this.earlySkip.invoke(st as any),
    );
  }

  public async repositoryAnalyzerStep(
    state: WorkflowGraphState,
  ): Promise<WorkflowGraphUpdate> {
    const nodeName = WorkflowNodeName.RepositoryAnalyzer;
    if (this.shouldSkip(state.runId, nodeName, state)) {
      this.logger.debug(
        `[${state.runId}] Skipping node [${nodeName}] (recovery mode)`,
      );
      return { currentNode: nodeName, executionStatus: WorkflowStatus.Running };
    }

    const ctx = this.getOrchestrationContext(state.runId);
    return this.wrapper.executeNode(
      nodeName,
      WorkflowStage.ANALYZING,
      state,
      ctx,
      async (st) => this.repositoryAnalyzer.invoke(st as any),
    );
  }

  public async documentationLocatorStep(
    state: WorkflowGraphState,
  ): Promise<WorkflowGraphUpdate> {
    const nodeName = WorkflowNodeName.DocumentationLocator;
    if (this.shouldSkip(state.runId, nodeName, state)) {
      this.logger.debug(
        `[${state.runId}] Skipping node [${nodeName}] (recovery mode)`,
      );
      return { currentNode: nodeName, executionStatus: WorkflowStatus.Running };
    }

    const ctx = this.getOrchestrationContext(state.runId);
    return this.wrapper.executeNode(
      nodeName,
      WorkflowStage.LOCATING_DOCUMENTATION,
      state,
      ctx,
      async (st) => this.documentationLocator.invoke(st as any, ctx),
    );
  }

  public async codebaseAnalyzerStep(
    state: WorkflowGraphState,
  ): Promise<WorkflowGraphUpdate> {
    const nodeName = WorkflowNodeName.CodebaseAnalyzer;
    if (this.shouldSkip(state.runId, nodeName, state)) {
      this.logger.debug(
        `[${state.runId}] Skipping node [${nodeName}] (recovery mode)`,
      );
      return { currentNode: nodeName, executionStatus: WorkflowStatus.Running };
    }

    const ctx = this.getOrchestrationContext(state.runId);
    return this.wrapper.executeNode(
      nodeName,
      WorkflowStage.SOURCE_CODE_ANALYSIS,
      state,
      ctx,
      async (st) => this.codebaseAnalyzer.invoke(st as any),
    );
  }

  public async technicalWriterStep(
    state: WorkflowGraphState,
  ): Promise<WorkflowGraphUpdate> {
    const nodeName = WorkflowNodeName.TechnicalWriter;
    if (this.shouldSkip(state.runId, nodeName, state)) {
      this.logger.debug(
        `[${state.runId}] Skipping node [${nodeName}] (recovery mode)`,
      );
      return { currentNode: nodeName, executionStatus: WorkflowStatus.Running };
    }

    const ctx = this.getOrchestrationContext(state.runId);
    return this.wrapper.executeNode(
      nodeName,
      WorkflowStage.WRITING,
      state,
      ctx,
      async (st) => this.technicalWriter.invoke(st as any),
    );
  }

  public async documentationCriticStep(
    state: WorkflowGraphState,
  ): Promise<WorkflowGraphUpdate> {
    const nodeName = WorkflowNodeName.DocumentationCritic;
    if (this.shouldSkip(state.runId, nodeName, state)) {
      this.logger.debug(
        `[${state.runId}] Skipping node [${nodeName}] (recovery mode)`,
      );
      return { currentNode: nodeName, executionStatus: WorkflowStatus.Running };
    }

    const ctx = this.getOrchestrationContext(state.runId);
    return this.wrapper.executeNode(
      nodeName,
      WorkflowStage.REVIEWING,
      state,
      ctx,
      async (st) => this.documentationCritic.invoke(st as any),
    );
  }

  public async gitCommitStep(
    state: WorkflowGraphState,
  ): Promise<WorkflowGraphUpdate> {
    const nodeName = WorkflowNodeName.GitCommit;
    if (this.shouldSkip(state.runId, nodeName, state)) {
      this.logger.debug(
        `[${state.runId}] Skipping node [${nodeName}] (recovery mode)`,
      );
      return { currentNode: nodeName, executionStatus: WorkflowStatus.Running };
    }

    const ctx = this.getOrchestrationContext(state.runId);
    return this.wrapper.executeNode(
      nodeName,
      WorkflowStage.COMMITTING,
      state,
      ctx,
      async (st) => this.gitCommit.invoke(st as any, ctx),
    );
  }

  public async pushBranchStep(
    state: WorkflowGraphState,
  ): Promise<WorkflowGraphUpdate> {
    const nodeName = WorkflowNodeName.PushBranch;
    if (this.shouldSkip(state.runId, nodeName, state)) {
      this.logger.debug(
        `[${state.runId}] Skipping node [${nodeName}] (recovery mode)`,
      );
      return { currentNode: nodeName, executionStatus: WorkflowStatus.Running };
    }

    const ctx = this.getOrchestrationContext(state.runId);
    return this.wrapper.executeNode(
      nodeName,
      WorkflowStage.PUSHING,
      state,
      ctx,
      async (st) => this.pushBranch.invoke(st as any),
    );
  }

  public async createPullRequestStep(
    state: WorkflowGraphState,
  ): Promise<WorkflowGraphUpdate> {
    const nodeName = WorkflowNodeName.CreatePullRequest;
    if (this.shouldSkip(state.runId, nodeName, state)) {
      this.logger.debug(
        `[${state.runId}] Skipping node [${nodeName}] (recovery mode)`,
      );
      return { currentNode: nodeName, executionStatus: WorkflowStatus.Running };
    }

    const ctx = this.getOrchestrationContext(state.runId);
    return this.wrapper.executeNode(
      nodeName,
      WorkflowStage.CREATING_PULL_REQUEST,
      state,
      ctx,
      async (st) => this.createPullRequest.invoke(st as any, ctx),
    );
  }

  public async pullRequestGeneratorStep(
    state: WorkflowGraphState,
  ): Promise<WorkflowGraphUpdate> {
    return this.createPullRequestStep(state);
  }
}
