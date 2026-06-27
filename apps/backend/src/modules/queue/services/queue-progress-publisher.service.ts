import { Injectable, Logger, Optional } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QueueEventStatus, RealtimeWorkflowStage } from '@docpulse/shared-types';
import { WorkflowStage } from '../../../domain/workflow';

import type { ProgressPublisher, WorkflowProgressEvent } from '../types/progress.types';
import { WorkflowEventService } from '../../realtime/services/workflow-event.service';

@Injectable()
export class QueueProgressPublisherService implements ProgressPublisher {
  private readonly logger = new Logger(QueueProgressPublisherService.name);

  constructor(@Optional() private readonly eventService?: WorkflowEventService) {}

  /**
   * Publishes structured progress update to active BullMQ job and logs metadata.
   * Designed for future extension to WebSockets, SSE, or Redis Pub/Sub.
   */
  public async publishJobProgress(job: Job, event: Omit<WorkflowProgressEvent, 'jobId'>): Promise<void> {
    const fullEvent: WorkflowProgressEvent = {
      ...event,
      jobId: job.id ?? 'unknown',
    };

    this.logger.log(`[Progress] [${fullEvent.stage}] (${fullEvent.percentage}%) ${fullEvent.message}`, {
      jobId: fullEvent.jobId,
      runId: fullEvent.runId,
      repositoryId: fullEvent.repositoryId,
      stage: fullEvent.stage,
      percentage: fullEvent.percentage,
    });

    try {
      await job.updateProgress({
        stage: fullEvent.stage,
        message: fullEvent.message,
        percentage: fullEvent.percentage,
        timestamp: fullEvent.timestamp,
        queueStatus: fullEvent.queueStatus,
        status: fullEvent.realtimeStatus,
        metadata: fullEvent.metadata,
      });
    } catch (error) {
      this.logger.warn(`Failed to update BullMQ job progress: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Broadcast via WebSockets Gateway
    await this.publishProgress(fullEvent);
  }

  public async publishProgress(event: WorkflowProgressEvent): Promise<void> {
    if (this.eventService) {
      const queueStatus = event.queueStatus ?? this.deriveQueueStatus(event.stage);
      this.eventService.publishQueueEvent(
        event.runId,
        event.repositoryId,
        event.runId, // workflowId
        queueStatus,
        event.percentage,
        { message: event.message, stage: event.stage, ...event.metadata },
        {
          stage: event.realtimeStage ?? this.mapRealtimeStage(event.stage, queueStatus),
          status: event.realtimeStatus ?? this.mapRealtimeStatus(queueStatus),
        },
      );
    }
  }

  private deriveQueueStatus(stage: WorkflowProgressEvent['stage']): QueueEventStatus {
    switch (stage) {
      case 'QUEUED':
        return QueueEventStatus.Queued;
      case 'FAILED':
        return QueueEventStatus.Failed;
      case 'FINISHED':
        return QueueEventStatus.Completed;
      default:
        return QueueEventStatus.Active;
    }
  }

  private mapRealtimeStatus(queueStatus: QueueEventStatus): string {
    switch (queueStatus) {
      case QueueEventStatus.Queued:
      case QueueEventStatus.Waiting:
        return 'waiting';
      case QueueEventStatus.Completed:
        return 'completed';
      case QueueEventStatus.Failed:
        return 'failed';
      case QueueEventStatus.Stalled:
        return 'cancelled';
      case QueueEventStatus.Active:
      default:
        return 'running';
    }
  }

  private mapRealtimeStage(stage: WorkflowProgressEvent['stage'], queueStatus: QueueEventStatus): RealtimeWorkflowStage {
    switch (queueStatus) {
      case QueueEventStatus.Queued:
        return RealtimeWorkflowStage.Queued;
      case QueueEventStatus.Completed:
        return RealtimeWorkflowStage.Completed;
      case QueueEventStatus.Failed:
      case QueueEventStatus.Stalled:
        return RealtimeWorkflowStage.Failed;
      default:
        break;
    }

    switch (stage) {
      case WorkflowStage.CLONING:
        return RealtimeWorkflowStage.Cloning;
      case WorkflowStage.ANALYZING:
      case WorkflowStage.LOCATING_DOCUMENTATION:
        return RealtimeWorkflowStage.Analyzing;
      case WorkflowStage.WRITING:
        return RealtimeWorkflowStage.Writing;
      case WorkflowStage.REVIEWING:
        return RealtimeWorkflowStage.Reviewing;
      case WorkflowStage.COMMITTING:
      case WorkflowStage.PUSHING:
      case WorkflowStage.CREATING_PULL_REQUEST:
        return RealtimeWorkflowStage.CreatingPR;
      case 'QUEUED':
        return RealtimeWorkflowStage.Queued;
      case 'FINISHED':
        return RealtimeWorkflowStage.Completed;
      case 'FAILED':
        return RealtimeWorkflowStage.Failed;
      default:
        return RealtimeWorkflowStage.Cloning;
    }
  }
}
