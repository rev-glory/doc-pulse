import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '@/database';
import { WorkflowCheckpointRepository } from '../persistence/workflow-checkpoint.repository';
import { WorkflowGraphState, WorkflowGraphUpdate, WorkflowError } from './graph.types';
import { WorkflowNodeExecutionException } from './workflow-node-adapters';
import {
  WorkflowNodeName,
  WorkflowStage,
  WorkflowCheckpointSnapshot,
  WorkflowStatus,
} from '../../../domain/workflow';
import { WorkflowEventService } from '../../realtime/services/workflow-event.service';

export interface ExecutionContextRef {
  expectedVersion: number;
  completedNodes: WorkflowNodeName[];
  nodeRetries: Record<string, number>;
}

@Injectable()
export class WorkflowNodeExecutionWrapper {
  private readonly logger = new Logger(WorkflowNodeExecutionWrapper.name);

  constructor(
    private readonly checkpointRepository: WorkflowCheckpointRepository,
    private readonly prisma: PrismaService,
    @Optional() private readonly eventService?: WorkflowEventService,
  ) {}

  /**
   * Executes a business node through single-responsibility persistence middleware.
   * Atomically saves checkpoint on success or records node failure/retry on exception.
   */
  public async executeNode(
    nodeName: WorkflowNodeName,
    stage: WorkflowStage,
    state: WorkflowGraphState,
    execContext: ExecutionContextRef,
    businessExecutor: (state: WorkflowGraphState) => Promise<WorkflowGraphUpdate>,
  ): Promise<WorkflowGraphUpdate> {
    const startTime = Date.now();
    const runId = state.runId;
    const isoStart = new Date().toISOString();

    this.logger.debug(`[${runId}] Executing wrapper for node [${nodeName}] (stage: ${stage})`);

    // Verify repository still exists in database (safety check before each node)
    const repo = await this.prisma.repository.findUnique({
      where: { id: state.repositoryId },
    });
    if (!repo) {
      this.logger.error(`[${runId}] Repository access revoked. Stopping workflow execution.`);
      await this.checkpointRepository.markRunFailed(runId, 'Repository access revoked.');
      throw new Error('Repository access revoked.');
    }

    if (this.eventService) {
      this.eventService.publishNodeExecutionEvent(runId, state.repositoryId || '', runId, {
        nodeName,
        status: 'started',
        startedAt: isoStart,
      });
    }

    try {
      // 1. Execute pure business logic
      const updated = await businessExecutor(state);
      const durationMs = Date.now() - startTime;

      // 2. Accumulate completed nodes
      const nextCompletedNodes = Array.from(new Set([...execContext.completedNodes, nodeName]));
      execContext.completedNodes = nextCompletedNodes;

      // 3. Build compact checkpoint snapshot excluding heavy markdown body
      const mergedState = { ...state, ...updated };
      const snapshot: WorkflowCheckpointSnapshot = this.constructLightweightSnapshot(
        mergedState,
        nodeName,
        nextCompletedNodes,
      );

      const SEQUENTIAL_NODES = [
        WorkflowNodeName.RepositoryAnalyzer,
        WorkflowNodeName.DocumentationLocator,
        WorkflowNodeName.CodebaseAnalyzer,
        WorkflowNodeName.TechnicalWriter,
        WorkflowNodeName.DocumentationCritic,
        WorkflowNodeName.GitCommit,
        WorkflowNodeName.PushBranch,
        WorkflowNodeName.CreatePullRequest,
      ];
      const progress = Math.min(
        Math.round((nextCompletedNodes.filter(n => SEQUENTIAL_NODES.includes(n)).length / SEQUENTIAL_NODES.length) * 100),
        99
      );

      // 4. Atomically persist checkpoint transaction
      const nextVersion = await this.checkpointRepository.saveNodeCheckpoint({
        runId,
        expectedVersion: execContext.expectedVersion,
        nodeName,
        stage,
        snapshot,
        status: 'CHECKPOINTED',
        nodeRetries: execContext.nodeRetries,
        newMetadata: {
          lastSuccessfulNode: nodeName,
          lastNodeDurationMs: durationMs,
          progress,
        },
      });

      execContext.expectedVersion = nextVersion;

      this.logger.log(`[${runId}] Node [${nodeName}] completed successfully in ${durationMs}ms.`);

      if (this.eventService) {
        this.eventService.publishNodeExecutionEvent(runId, state.repositoryId || '', runId, {
          nodeName,
          status: 'completed',
          startedAt: isoStart,
          completedAt: new Date().toISOString(),
          duration: durationMs,
        });
      }

      return {
        ...updated,
        currentNode: nodeName,
        executionStatus: WorkflowStatus.Running,
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime;
      const cause = error instanceof Error ? error : new Error(String(error));

      const wfError: WorkflowError = {
        node: nodeName,
        message: cause.message,
        stack: cause.stack,
        timestamp: new Date().toISOString(),
      };

      // Increment node-level retry count
      const currentRetries = execContext.nodeRetries[nodeName] ?? 0;
      const nextRetries = currentRetries + 1;
      execContext.nodeRetries[nodeName] = nextRetries;

      this.logger.error(`[${runId}] Node [${nodeName}] failed after ${durationMs}ms (attempt ${nextRetries}): ${cause.message}`);

      if (this.eventService) {
        this.eventService.publishNodeExecutionEvent(runId, state.repositoryId || '', runId, {
          nodeName,
          status: 'failed',
          startedAt: isoStart,
          completedAt: new Date().toISOString(),
          duration: durationMs,
        });
      }

      try {
        const snapshot = this.constructLightweightSnapshot(state, nodeName, execContext.completedNodes);
        const nextVersion = await this.checkpointRepository.saveNodeCheckpoint({
          runId,
          expectedVersion: execContext.expectedVersion,
          nodeName,
          stage,
          snapshot,
          status: 'FAILED',
          nodeRetries: execContext.nodeRetries,
          error: wfError,
          newMetadata: {
            failedNode: nodeName,
            failedDurationMs: durationMs,
          },
        });
        execContext.expectedVersion = nextVersion;
      } catch (persistenceError) {
        this.logger.error(`[${runId}] Failed to persist error checkpoint for node [${nodeName}]:`, persistenceError);
      }

      throw new WorkflowNodeExecutionException(nodeName, cause, wfError);
    }
  }

  /**
   * Constructs compact snapshot stripping heavy raw generated markdown text.
   */
  private constructLightweightSnapshot(
    state: WorkflowGraphState | Record<string, any>,
    currentNode: WorkflowNodeName,
    completedNodes: WorkflowNodeName[],
  ): WorkflowCheckpointSnapshot {
    const generatedRefs = (state.generatedDocuments ?? []).map((doc: any) => ({
      id: doc.id ?? 'unknown',
      title: doc.title ?? '',
      path: doc.path ?? '',
      type: doc.type ?? 'README',
    }));

    const criticRef = state.criticReview
      ? {
          score: state.criticReview.score ?? 0,
          passed: state.criticReview.passed ?? false,
          issueCount: (state.criticReview.issues ?? []).length,
          suggestionCount: (state.criticReview.suggestions ?? []).length,
        }
      : undefined;

    return {
      workflowRunId: state.runId ?? 'unknown',
      repositoryId: state.repositoryId ?? 'unknown',
      workspacePath: state.workspacePath ?? '',
      currentNode,
      completedNodes,
      analysisReference: state.repository ? JSON.parse(JSON.stringify(state.repository)) : undefined,
      documentationInventoryReference: state.documentation
        ? { fileCount: (state.documentation.documentationFiles ?? []).length }
        : undefined,
      generatedDocumentReferences: generatedRefs,
      criticReviewReference: criticRef,
      pullRequestReference: state.pullRequest ? { url: state.pullRequest.url, number: state.pullRequest.number } : undefined,
      pullRequestUrl: state.pullRequestUrl ?? undefined,
      gitOperationStatus: state.gitOperationStatus ?? undefined,
      changedFiles: state.changedFiles ?? undefined,
      commitMessage: state.commitMessage ?? undefined,
      shouldSkip: state.shouldSkip ?? undefined,
      skipReason: state.skipReason ?? undefined,
      previousGeneratedDocumentation: state.previousGeneratedDocumentation ?? undefined,
      executionMetadata: state.metadata ?? {},
      lastUpdatedTimestamp: new Date().toISOString(),
      // Complete state details persisted for recovery:
      documentation: state.documentation ?? undefined,
      generatedDocuments: state.generatedDocuments ?? undefined,
      criticReview: state.criticReview ?? undefined,
      targetBranch: state.targetBranch ?? undefined,
      commitSha: state.commitSha ?? undefined,
      humanReviewFeedback: state.humanReviewFeedback ?? undefined,
      generationIteration: state.generationIteration ?? 1,
      sourceCodeAnalysis: state.sourceCodeAnalysis ?? undefined,
    } as any;
  }
}
