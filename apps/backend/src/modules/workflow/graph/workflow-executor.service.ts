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
import { PrismaService } from '@/database';
import { RunStatus as PrismaRunStatus, WorkflowStage as PrismaWorkflowStage } from '@/generated/prisma/enums';
import { RepositoryCloneService } from '../../git-operations/services/repository-clone.service';
import { WorkspaceLifecycleService } from '../../git-operations/services/workspace-lifecycle.service';
import { classifyWorkflowError, QueueErrorClassification } from '../../queue/types/queue-errors';

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
    private readonly prisma: PrismaService,
    private readonly repositoryCloneService: RepositoryCloneService,
    private readonly workspaceLifecycleService: WorkspaceLifecycleService,
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

    // 1. Re-clone if workspace directory is missing on disk
    const workspaceExists = await this.workspaceLifecycleService.workspaceExists(input.repositoryId);
    if (!workspaceExists) {
      this.logger.log(`[${input.runId}] Local workspace directory missing. Re-cloning repository...`);
      const repoRecord = await this.prisma.repository.findUnique({
        where: { id: runRecord.repositoryId },
      });
      if (!repoRecord) {
        throw new Error(`Cannot resume workflow: Repository [${runRecord.repositoryId}] not found in database.`);
      }
      await this.repositoryCloneService.cloneRepository({
        id: repoRecord.id,
        cloneUrl: repoRecord.cloneUrl,
        defaultBranch: repoRecord.defaultBranch,
      });
    }

    const snapshot = (runRecord.checkpointSnapshot ?? null) as WorkflowCheckpointSnapshot | null;
    const completedNodes = snapshot?.completedNodes ?? [];
    const lastNode = snapshot?.currentNode;

    // 2. Derive start node statelessly based on database review status (Invariant 4)
    let firstNodeToExecute: WorkflowNodeName;
    let activeReview: any = null;

    if (runRecord.currentReviewId) {
      activeReview = await this.prisma.review.findUnique({
        where: { id: runRecord.currentReviewId },
      });
    }

    if (lastNode === ('HumanReview' as any)) {
      firstNodeToExecute = WorkflowNodeName.GitCommit;
    } else if (activeReview && activeReview.status === 'REJECTED') {
      firstNodeToExecute = WorkflowNodeName.TechnicalWriter;
    } else if (activeReview && activeReview.status === 'APPROVED') {
      firstNodeToExecute = WorkflowNodeName.GitCommit;
    } else {
      firstNodeToExecute = this.determineNextNode(lastNode);
    }

    // 3. Mark run status as RUNNING (accurate status lifecycle)
    await this.prisma.workflowRun.update({
      where: { id: input.runId },
      data: { status: 'RUNNING' },
    });

    const nodeRetries = (runRecord.nodeRetries && typeof runRecord.nodeRetries === 'object'
      ? runRecord.nodeRetries
      : {}) as Record<string, number>;

    const hydratedState = this.hydrateStateFromSnapshot(input, snapshot);

    let humanReviewFeedback: string | undefined = undefined;
    if (activeReview && activeReview.comment) {
      try {
        const parsed = JSON.parse(activeReview.comment);
        humanReviewFeedback = parsed.text || parsed.comment || activeReview.comment;
      } catch {
        humanReviewFeedback = activeReview.comment;
      }
    }

    return this.orchestrateGraphInvocation({
      input,
      expectedVersion: runRecord.version,
      firstNodeToExecute,
      completedNodes,
      nodeRetries,
      initialStateOverride: {
        ...hydratedState,
        humanReviewStatus: activeReview ? activeReview.status : undefined,
        humanReviewFeedback,
      },
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

  private determineNextNode(lastCompletedNode?: WorkflowNodeName): WorkflowNodeName {
    if (!lastCompletedNode) return WorkflowNodeName.RepositoryAnalyzer;

    // Legacy checkpoint compatibility (Invariant 7)
    if (lastCompletedNode === ('HumanReview' as any)) {
      return WorkflowNodeName.GitCommit;
    }

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

    const workspacePath = this.workspaceLifecycleService.getWorkspacePath(input.repositoryId);

    return {
      runId: input.runId,
      repositoryId: input.repositoryId,
      workspacePath,
      repository: snapshot.analysisReference ? snapshot.analysisReference : undefined,
      documentation: (snapshot as any).documentation ?? undefined,
      generatedDocuments: (snapshot as any).generatedDocuments ?? undefined,
      criticReview: (snapshot as any).criticReview ?? undefined,
      branchName: (snapshot as any).branchName ?? undefined,
      commitSha: (snapshot as any).commitSha ?? undefined,
      humanReviewFeedback: (snapshot as any).humanReviewFeedback ?? undefined,
      generationIteration: (snapshot as any).generationIteration ?? 1,
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

    let isExecutionTerminal = false;
    try {
      const finalState = (await this.compiledGraph.invoke(baselineState as WorkflowGraphState)) as any;
      const durationMs = Date.now() - startTime;

      if (finalState.currentNode === WorkflowNodeName.DocumentationCritic) {
        this.logger.log(`[${input.runId}] Workflow execution suspended at node [${finalState.currentNode}] for human review.`);
        
        // Atomic suspension transaction (Invariant 1, Invariant 6)
        await this.prisma.$transaction(async (tx) => {
          const existingPending = await tx.review.findFirst({
            where: { workflowRunId: input.runId, status: 'PENDING' },
          });
          if (existingPending) {
            throw new Error(`Invariant Violation: Pending review already exists for WorkflowRun [${input.runId}].`);
          }

          const newReview = await tx.review.create({
            data: {
              workflowRunId: input.runId,
              status: 'PENDING',
              metrics: finalState.criticReview || {},
            },
          });

          await tx.workflowRun.update({
            where: { id: input.runId },
            data: {
              currentReviewId: newReview.id,
              status: PrismaRunStatus.WAITING_FOR_REVIEW,
              currentNode: WorkflowNodeName.DocumentationCritic,
              currentStage: PrismaWorkflowStage.REVIEWING,
              completedAt: null,
              errorMessage: null,
              updatedAt: new Date(),
            },
          });
        });
        this.logger.log(`WorkflowRun [${input.runId}] suspended and marked as WAITING_FOR_REVIEW.`);
        
        this.eventService?.publishWaitingForReviewEvent(
          input.runId,
          input.repositoryId,
          input.runId,
          finalState.criticReview,
        );

        return {
          ...finalState,
          executionStatus: WorkflowStatus.WaitingForReview,
        } as unknown as DomainWorkflowState;
      }

      this.logger.log(`[${input.runId}] Workflow execution completed successfully in ${durationMs}ms.`);

      await this.checkpointRepository.markRunCompleted(input.runId);
      this.eventService?.publishCompletionEvent(input.runId, input.repositoryId, input.runId, finalState.metadata);

      isExecutionTerminal = true;

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

      const isPermanent = classifyWorkflowError(error) === QueueErrorClassification.PERMANENT;
      if (isPermanent) {
        isExecutionTerminal = true;
      }

      if (error instanceof WorkflowNodeExecutionException) {
        this.logger.error(
          `[${input.runId}] Workflow terminated at node [${error.node}] after ${durationMs}ms: ${error.workflowError.message}`,
        );
        await this.checkpointRepository.markRunFailed(input.runId, error.workflowError.message);
        this.eventService?.publishFailureEvent(
          input.runId,
          input.repositoryId,
          input.runId,
          error.workflowError.message,
          error.node,
        );
        throw error;
      }

      const cause = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`[${input.runId}] Unexpected orchestration failure: ${cause.message}`, cause.stack);
      await this.checkpointRepository.markRunFailed(input.runId, cause.message);
      this.eventService?.publishFailureEvent(
        input.runId,
        input.repositoryId,
        input.runId,
        cause.message,
      );
      throw cause;
    } finally {
      this.adapters.clearExecutionContext(input.runId);
      if (isExecutionTerminal) {
        try {
          if (await this.workspaceLifecycleService.shouldCleanup(input.repositoryId)) {
            await this.workspaceLifecycleService.deleteWorkspace(input.repositoryId);
          }
        } catch (cleanupError) {
          this.logger.error(
            `[${input.runId}] Failed to clean up workspace for repository [${input.repositoryId}] during terminal execution cleanup:`,
            cleanupError,
          );
        }
      }
    }
  }
}
