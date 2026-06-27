import { Injectable, Logger } from '@nestjs/common';
import { WorkflowGateway } from '../gateways/workflow.gateway';
import {
  RealtimeEventPayload,
  RealtimeWorkflowStage,
  WorkflowEventType,
  QueueEventStatus,
  NodeExecutionEventMetadata,
} from '@docpulse/shared-types';

@Injectable()
export class WorkflowEventService {
  private readonly logger = new Logger(WorkflowEventService.name);

  constructor(private readonly gateway: WorkflowGateway) {}

  /**
   * Publishes general workflow lifecycle transition events with structured logging.
   */
  public publishWorkflowEvent(payload: RealtimeEventPayload): void {
    this.logger.log(`[Event: ${payload.eventType}] Run: [${payload.runId}] Stage: [${payload.stage}] (${payload.progress}%)`, {
      runId: payload.runId,
      repositoryId: payload.repositoryId,
      workflowId: payload.workflowId,
      stage: payload.stage,
      status: payload.status,
      progress: payload.progress,
    });

    this.gateway.emitEvent(payload);
  }

  /**
   * Publishes queue state updates originating from BullMQ workers/producers.
   */
  public publishQueueEvent(
    runId: string,
    repositoryId: string,
    workflowId: string,
    queueStatus: QueueEventStatus,
    progress: number,
    metadata?: Record<string, unknown>,
    overrides?: { stage?: RealtimeWorkflowStage; status?: string },
  ): void {
    const payload: RealtimeEventPayload = {
      runId,
      repositoryId,
      workflowId,
      stage: overrides?.stage ?? this.mapQueueStatusToStage(queueStatus),
      progress,
      status: overrides?.status ?? this.mapQueueStatusToStatus(queueStatus),
      timestamp: new Date().toISOString(),
      eventType: WorkflowEventType.QueueEvent,
      queueStatus,
      metadata,
    };

    this.publishWorkflowEvent(payload);
  }

  /**
   * Publishes LangGraph node execution boundary events (before/after node execution).
   */
  public publishNodeExecutionEvent(
    runId: string,
    repositoryId: string,
    workflowId: string,
    nodeMetadata: NodeExecutionEventMetadata,
    metadata?: Record<string, unknown>,
  ): void {
    const stage = this.mapNodeToStage(nodeMetadata.nodeName);
    const progress = this.calculateNodeProgress(nodeMetadata.nodeName, nodeMetadata.status);

    const eventType =
      nodeMetadata.status === 'started'
        ? WorkflowEventType.WorkflowNodeStarted
        : nodeMetadata.status === 'completed'
          ? WorkflowEventType.WorkflowNodeCompleted
          : WorkflowEventType.WorkflowFailed;

    const payload: RealtimeEventPayload = {
      runId,
      repositoryId,
      workflowId,
      stage,
      progress,
      status: nodeMetadata.status === 'failed' ? 'failed' : 'running',
      timestamp: new Date().toISOString(),
      eventType,
      node: nodeMetadata,
      metadata,
    };

    this.publishWorkflowEvent(payload);
  }

  /**
   * Publishes terminal successful workflow completion event.
   */
  public publishCompletionEvent(runId: string, repositoryId: string, workflowId: string, metadata?: Record<string, unknown>): void {
    const payload: RealtimeEventPayload = {
      runId,
      repositoryId,
      workflowId,
      stage: RealtimeWorkflowStage.Completed,
      progress: 100,
      status: 'completed',
      timestamp: new Date().toISOString(),
      eventType: WorkflowEventType.WorkflowCompleted,
      metadata,
    };

    this.publishWorkflowEvent(payload);
  }

  /**
   * Publishes terminal workflow failure or cancellation event.
   */
  public publishFailureEvent(
    runId: string,
    repositoryId: string,
    workflowId: string,
    errorMessage: string,
    failedNode?: string,
    isCancelled = false,
  ): void {
    const stage = failedNode ? this.mapNodeToStage(failedNode) : RealtimeWorkflowStage.Failed;

    const payload: RealtimeEventPayload = {
      runId,
      repositoryId,
      workflowId,
      stage,
      progress: 0,
      status: isCancelled ? 'cancelled' : 'failed',
      timestamp: new Date().toISOString(),
      eventType: isCancelled ? WorkflowEventType.WorkflowCancelled : WorkflowEventType.WorkflowFailed,
      metadata: { error: errorMessage, failedNode },
    };

    this.publishWorkflowEvent(payload);
  }

  public mapNodeToStage(nodeName: string): RealtimeWorkflowStage {
    switch (nodeName) {
      case 'RepositoryAnalyzer':
      case 'DocumentationLocator':
        return RealtimeWorkflowStage.Analyzing;
      case 'TechnicalWriter':
        return RealtimeWorkflowStage.Writing;
      case 'DocumentationCritic':
        return RealtimeWorkflowStage.Reviewing;
      case 'GitCommit':
      case 'PushBranch':
      case 'CreatePullRequest':
        return RealtimeWorkflowStage.CreatingPR;
      default:
        return RealtimeWorkflowStage.Analyzing;
    }
  }

  private mapQueueStatusToStage(queueStatus: QueueEventStatus): RealtimeWorkflowStage {
    switch (queueStatus) {
      case QueueEventStatus.Active:
        return RealtimeWorkflowStage.Cloning;
      case QueueEventStatus.Completed:
        return RealtimeWorkflowStage.Completed;
      case QueueEventStatus.Failed:
      case QueueEventStatus.Stalled:
        return RealtimeWorkflowStage.Failed;
      case QueueEventStatus.Waiting:
      case QueueEventStatus.Queued:
      default:
        return RealtimeWorkflowStage.Queued;
    }
  }

  private mapQueueStatusToStatus(queueStatus: QueueEventStatus): string {
    switch (queueStatus) {
      case QueueEventStatus.Completed:
        return 'completed';
      case QueueEventStatus.Failed:
        return 'failed';
      case QueueEventStatus.Stalled:
        return 'cancelled';
      case QueueEventStatus.Waiting:
        return 'waiting';
      case QueueEventStatus.Queued:
        return 'queued';
      case QueueEventStatus.Active:
      default:
        return 'running';
    }
  }

  public calculateNodeProgress(nodeName: string, status: 'started' | 'completed' | 'failed'): number {
    if (status === 'failed') return 0;
    const isCompleted = status === 'completed';

    switch (nodeName) {
      case 'RepositoryAnalyzer':
        return isCompleted ? 25 : 15;
      case 'DocumentationLocator':
        return isCompleted ? 40 : 30;
      case 'TechnicalWriter':
        return isCompleted ? 60 : 50;
      case 'DocumentationCritic':
        return isCompleted ? 75 : 65;
      case 'GitCommit':
        return isCompleted ? 85 : 80;
      case 'PushBranch':
        return isCompleted ? 95 : 90;
      case 'CreatePullRequest':
        return isCompleted ? 100 : 95;
      default:
        return 50;
    }
  }
}
