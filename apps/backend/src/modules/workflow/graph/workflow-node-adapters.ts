import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { RepositoryAnalyzerNode } from '../nodes/repository-analyzer.node';
import { DocumentationLocatorNode } from '../nodes/documentation-locator.node';
import { TechnicalWriterNode } from '../nodes/technical-writer.node';
import { DocumentationCriticNode } from '../nodes/documentation-critic.node';
import { WorkflowGraphState, WorkflowGraphUpdate, WorkflowError } from './graph.types';
import { WorkflowNodeExecutionWrapper, ExecutionContextRef } from './workflow-node-execution.wrapper';
import { WorkflowNodeName, WorkflowStage, WorkflowStatus } from '../../../domain/workflow';

export class WorkflowNodeExecutionException extends Error {
  constructor(
    public readonly node: string,
    public readonly causeError: Error,
    public readonly workflowError: WorkflowError,
  ) {
    super(`Node [${node}] execution failed: ${causeError.message}`);
    this.name = 'WorkflowNodeExecutionException';
  }
}

export interface ActiveRunOrchestrationContext extends ExecutionContextRef {
  firstNodeToExecute: WorkflowNodeName;
}

@Injectable()
export class WorkflowNodeAdapters {
  private readonly logger = new Logger(WorkflowNodeAdapters.name);
  private readonly activeContexts = new Map<string, ActiveRunOrchestrationContext>();

  private readonly sequentialOrder: WorkflowNodeName[] = [
    WorkflowNodeName.RepositoryAnalyzer,
    WorkflowNodeName.DocumentationLocator,
    WorkflowNodeName.TechnicalWriter,
    WorkflowNodeName.DocumentationCritic,
    WorkflowNodeName.PullRequestGenerator,
  ];

  constructor(
    private readonly repositoryAnalyzer: RepositoryAnalyzerNode,
    private readonly documentationLocator: DocumentationLocatorNode,
    private readonly technicalWriter: TechnicalWriterNode,
    private readonly documentationCritic: DocumentationCriticNode,
    private readonly wrapper: WorkflowNodeExecutionWrapper,
  ) {}

  public registerExecutionContext(runId: string, context: ActiveRunOrchestrationContext): void {
    this.activeContexts.set(runId, context);
  }

  public clearExecutionContext(runId: string): void {
    this.activeContexts.delete(runId);
  }

  /**
   * Determines if a node should be skipped during recovery because it precedes firstNodeToExecute.
   */
  private shouldSkip(runId: string | undefined, nodeName: WorkflowNodeName): boolean {
    if (!runId) return false;
    const context = this.activeContexts.get(runId);
    if (!context) return false;

    const targetIndex = this.sequentialOrder.indexOf(context.firstNodeToExecute);
    const currentIndex = this.sequentialOrder.indexOf(nodeName);

    return currentIndex < targetIndex;
  }

  private getOrchestrationContext(runId: string): ActiveRunOrchestrationContext {
    const ctx = this.activeContexts.get(runId);
    if (!ctx) {
      throw new Error(`Orchestration context missing for run [${runId}]`);
    }
    return ctx;
  }

  public async repositoryAnalyzerStep(state: WorkflowGraphState): Promise<WorkflowGraphUpdate> {
    const nodeName = WorkflowNodeName.RepositoryAnalyzer;
    if (this.shouldSkip(state.runId, nodeName)) {
      this.logger.debug(`[${state.runId}] Skipping node [${nodeName}] (recovery mode)`);
      return { currentNode: nodeName, executionStatus: WorkflowStatus.Running };
    }

    const ctx = this.getOrchestrationContext(state.runId);
    return this.wrapper.executeNode(nodeName, WorkflowStage.ANALYZING, state, ctx, async (st) =>
      this.repositoryAnalyzer.invoke(st as any),
    );
  }

  public async documentationLocatorStep(state: WorkflowGraphState): Promise<WorkflowGraphUpdate> {
    const nodeName = WorkflowNodeName.DocumentationLocator;
    if (this.shouldSkip(state.runId, nodeName)) {
      this.logger.debug(`[${state.runId}] Skipping node [${nodeName}] (recovery mode)`);
      return { currentNode: nodeName, executionStatus: WorkflowStatus.Running };
    }

    const ctx = this.getOrchestrationContext(state.runId);
    return this.wrapper.executeNode(nodeName, WorkflowStage.LOCATING_DOCUMENTATION, state, ctx, async (st) =>
      this.documentationLocator.invoke(st as any),
    );
  }

  public async technicalWriterStep(state: WorkflowGraphState): Promise<WorkflowGraphUpdate> {
    const nodeName = WorkflowNodeName.TechnicalWriter;
    if (this.shouldSkip(state.runId, nodeName)) {
      this.logger.debug(`[${state.runId}] Skipping node [${nodeName}] (recovery mode)`);
      return { currentNode: nodeName, executionStatus: WorkflowStatus.Running };
    }

    const ctx = this.getOrchestrationContext(state.runId);
    return this.wrapper.executeNode(nodeName, WorkflowStage.WRITING, state, ctx, async (st) =>
      this.technicalWriter.invoke(st as any),
    );
  }

  public async documentationCriticStep(state: WorkflowGraphState): Promise<WorkflowGraphUpdate> {
    const nodeName = WorkflowNodeName.DocumentationCritic;
    if (this.shouldSkip(state.runId, nodeName)) {
      this.logger.debug(`[${state.runId}] Skipping node [${nodeName}] (recovery mode)`);
      return { currentNode: nodeName, executionStatus: WorkflowStatus.Running };
    }

    const ctx = this.getOrchestrationContext(state.runId);
    return this.wrapper.executeNode(nodeName, WorkflowStage.REVIEWING, state, ctx, async (st) =>
      this.documentationCritic.invoke(st as any),
    );
  }

  public async pullRequestGeneratorStep(state: WorkflowGraphState): Promise<WorkflowGraphUpdate> {
    const nodeName = WorkflowNodeName.PullRequestGenerator;
    if (this.shouldSkip(state.runId, nodeName)) {
      this.logger.debug(`[${state.runId}] Skipping node [${nodeName}] (recovery mode)`);
      return { currentNode: nodeName, executionStatus: WorkflowStatus.Running };
    }

    const ctx = this.getOrchestrationContext(state.runId);
    return this.wrapper.executeNode(nodeName, WorkflowStage.CREATING_PULL_REQUEST, state, ctx, async () => {
      throw new NotImplementedException('PullRequestGeneratorNode is not implemented yet');
    });
  }
}
