import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import type { ProgressPublisher, WorkflowProgressEvent } from '../types/progress.types';

@Injectable()
export class QueueProgressPublisherService implements ProgressPublisher {
  private readonly logger = new Logger(QueueProgressPublisherService.name);

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
        metadata: fullEvent.metadata,
      });
    } catch (error) {
      this.logger.warn(`Failed to update BullMQ job progress: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Future SSE / WebSocket / Redis PubSub broadcasting hook
    await this.publishProgress(fullEvent);
  }

  public async publishProgress(event: WorkflowProgressEvent): Promise<void> {
    // Abstraction point for external broadcasting (WebSockets, SSE, Redis Pub/Sub)
  }
}
