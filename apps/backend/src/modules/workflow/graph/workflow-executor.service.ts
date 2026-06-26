import { Injectable, Logger, OnModuleInit, BadRequestException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RealtimeWorkflowStage, WorkflowEventType } from '@docpulse/shared-types';
import { WorkflowNodeAdapters, WorkflowNodeExecutionException } from './workflow-node-adapters';
import { buildDocumentationWorkflowGraph, CompiledDocumentationGraph } from './documentation-workflow.graph';
import { WorkflowExecutionInput, WorkflowGraphState, WorkflowError } from './graph.types';
import { WorkflowCheckpointRepository } from '../persistence/workflow-checkpoint.repository';
import {
  WorkflowState as DomainWorkflowState,
  WorkflowStatus,
  WorkflowNodeName,
  WorkflowCheckpointSnapshot,
} from '../../../domain/workflow';
import { WorkflowEventService } from '../../realtime/services/workflow-event.service';

@Injectable()
export class WorkflowExecutorService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowExecutorService.name);
  private compiledGraph!: CompiledDocumentationGraph;

  private readonly sequentialOrder: WorkflowNodeName[] = [
    WorkflowNodeName.RepositoryAnalyzer,
    WorkflowNodeName.DocumentationLocator,
    WorkflowNodeName.TechnicalWriter,
    WorkflowNodeName.DocumentationCritic,
    WorkflowNodeName.GitCommit,
    WorkflowNodeName.PushBranch,
    WorkflowNodeName.CreatePullRequest,
  ];

  constructor(
    private readonly adapters: WorkflowNodeAdapters,
    private readonly configService: ConfigService,
    private readonly checkpointRepository: WorkflowCheckpointRepository,
    @Optional() private readonly eventService?: WorkflowEventService,
  ) {}

  public onModuleInit(): void {
    this.logger.debug('Initializing WorkflowExecutorService...');
    const minDocScore = this.configService.get<number>('WORKFLOW_MIN_DOC_SCORE', 80);

    this.compiledGraph = buildDocumentationWorkflowGraph(this.adapters, { minDocScore });
    this.logger.debug(`LangGraph orchestration engine compiled (minDocScore threshold: ${minDocScore}).`);
  }

  /**
   * Starts a brand new workflow run execution from START.
   */
  public async start(input: WorkflowExecutionInput): Promise<DomainWorkflowState> {
    this.logger.log(`[${input.runId}] Starting fresh workflow execution for repository [${input.repositoryId}]`);

    const runRecord = await this.checkpointRepository.initializeRun({
      runId: input.runId,
      repositoryId: input.repositoryId,
      correlationId: (input.metadata?.correlationId as string) ?? input.runId,
      webhookDeliveryId: (input.metadata?.webhookDeliveryId as string) ?? input.runId,
      commitSha: (input.metadata?.commitSha as string) ?? 'unknown',
      branch: (input.metadata?.branch as string) ?? 'main',
    });

    return this.orchestrateGraphInvocation({
      input,
      expectedVersion: runRecord.version,
      firstNodeToExecute: WorkflowNodeName.RepositoryAnalyzer,
      completedNodes: [],
      nodeRetries: {},
      initialStateOverride: undefined,
    });
  }

  /**
   * Resumes a crashed or paused workflow run execution from its latest checkpoint.
   */
  public async resume(input: WorkflowExecutionInput): Promise<DomainWorkflowState> {
    this.logger.log(`[${input.runId}] Resuming workflow execution for repository [${input.repositoryId}]`);

    const runRecord = await this.checkpointRepository.loadRunRecord(input.runId);
    if (!runRecord) {
      throw new BadRequestException(`Cannot resume non-existent WorkflowRun [${input.runId}]`);
    }

    if (runRecord.status === 'COMPLETED') {
      this.logger.warn(`[${input.runId}] WorkflowRun is already COMPLETED. Skipping resume.`);
      return { runId: input.runId, repositoryId: input.repositoryId, executionStatus: WorkflowStatus.Completed } as any;
    }

    const snapshot = (runRecord.checkpointSnapshot ?? null) as WorkflowCheckpointSnapshot | null;
    const completedNodes = snapshot?.completedNodes ?? [];
    const lastNode = snapshot?.currentNode;

    const firstNodeToExecute = this.determineNextNode(lastNode);
    const nodeRetries = (runRecord.nodeRetries && typeof runRecord.nodeRetries === 'object'
      ? runRecord.nodeRetries
      : {}) as Record<string, number>;

    const hydratedState = this.hydrateStateFromSnapshot(input, snapshot);

    return this.orchestrateGraphInvocation({
      input,
      expectedVersion: runRecord.version,
      firstNodeToExecute,
      completedNodes,
      nodeRetries,
      initialStateOverride: hydratedState,
    });
  }

  /**
   * Restarts an existing workflow run from START, wiping previous checkpoint state.
   */
  public async restart(input: WorkflowExecutionInput): Promise<DomainWorkflowState> {
    this.logger.log(`[${input.runId}] Restarting workflow execution for repository [${input.repositoryId}]`);

    const nextVersion = await this.checkpointRepository.resetRunForRestart(input.runId);

    return this.orchestrateGraphInvocation({
      input,
      expectedVersion: nextVersion,
      firstNodeToExecute: WorkflowNodeName.RepositoryAnalyzer,
      completedNodes: [],
      nodeRetries: {},
      initialStateOverride: undefined,
    });
  }

  /**
   * Determines the first sequential node that must execute given the last completed checkpoint node.
   */
  private determineNextNode(lastCompletedNode?: WorkflowNodeName): WorkflowNodeName {
    if (!lastCompletedNode) return WorkflowNodeName.RepositoryAnalyzer;
    if (lastCompletedNode === WorkflowNodeName.PullRequestGenerator) return WorkflowNodeName.GitCommit;

    const idx = this.sequentialOrder.indexOf(lastCompletedNode);
    if (idx === -1 || idx === this.sequentialOrder.length - 1) {
      return WorkflowNodeName.RepositoryAnalyzer;
    }

    return this.sequentialOrder[idx + 1]!;
  }

  /**
   * Hydrates baseline WorkflowGraphState from lightweight checkpoint snapshot reference pointers.
   */
  private hydrateStateFromSnapshot(
    input: WorkflowExecutionInput,
    snapshot: WorkflowCheckpointSnapshot | null,
  ): Partial<WorkflowGraphState> | undefined {
    if (!snapshot) return undefined;

    return {
      runId: input.runId,
      repositoryId: input.repositoryId,
      workspacePath: input.workspacePath,
      metadata: { ...(snapshot.executionMetadata ?? {}), hydratedAt: new Date().toISOString() },
    };
  }

  /**
   * Master execution flow setting up adapter context and handling global exceptions.
   */
  private async orchestrateGraphInvocation(params: {
    input: WorkflowExecutionInput;
    expectedVersion: number;
    firstNodeToExecute: WorkflowNodeName;
    completedNodes: WorkflowNodeName[];
    nodeRetries: Record<string, number>;
    initialStateOverride?: Partial<WorkflowGraphState>;
  }): Promise<DomainWorkflowState> {
    const { input, expectedVersion, firstNodeToExecute, completedNodes, nodeRetries, initialStateOverride } = params;
    const startTime = Date.now();

    const orchestrationContext = {
      expectedVersion,
      firstNodeToExecute,
      completedNodes,
      nodeRetries,
    };

    this.adapters.registerExecutionContext(input.runId, orchestrationContext);

    const baselineState: Partial<WorkflowGraphState> = initialStateOverride ?? {
      runId: input.runId,
      repositoryId: input.repositoryId,
      workspacePath: input.workspacePath,
      executionStatus: WorkflowStatus.Pending,
      currentNode: 'START',
      errors: [],
      metadata: { ...(input.metadata ?? {}), startedAt: new Date().toISOString() },
    };

    try {
      const finalState = await this.compiledGraph.invoke(baselineState as WorkflowGraphState);
      const durationMs = Date.now() - startTime;

      this.logger.log(`[${input.runId}] Workflow execution completed successfully in ${durationMs}ms.`);

      return {
        ...finalState,
        executionStatus: WorkflowStatus.Completed,
        metadata: {
          ...(finalState.metadata ?? {}),
          completedAt: new Date().toISOString(),
          totalDurationMs: durationMs,
        },
      } as unknown as DomainWorkflowState;
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime;

      if (error instanceof WorkflowNodeExecutionException) {
        this.logger.error(
          `[${input.runId}] Workflow terminated at node [${error.node}] after ${durationMs}ms: ${error.workflowError.message}`,
        );
        throw error;
      }

      const cause = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`[${input.runId}] Unexpected orchestration failure: ${cause.message}`, cause.stack);
      throw cause;
    } finally {
      this.adapters.clearExecutionContext(input.runId);
    }
  }
}
