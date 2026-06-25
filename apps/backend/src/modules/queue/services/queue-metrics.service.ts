import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { WORKFLOW_EXECUTION_QUEUE } from '../constants/queue.constants';
import type { QueueSnapshotMetrics, QueueMetricsCollector } from '../types/queue-metrics.types';

@Injectable()
export class QueueMetricsService implements QueueMetricsCollector {
  private readonly logger = new Logger(QueueMetricsService.name);

  private jobsProcessed = 0;
  private jobsFailed = 0;
  private jobsRetried = 0;
  private dlqJobsRouted = 0;
  private totalProcessingDurationMs = 0;

  constructor(
    @InjectQueue(WORKFLOW_EXECUTION_QUEUE)
    private readonly workflowQueue: Queue,
  ) {}

  public recordJobProcessed(durationMs: number): void {
    this.jobsProcessed++;
    this.totalProcessingDurationMs += durationMs;
  }

  public recordJobFailed(isPermanent: boolean): void {
    this.jobsFailed++;
  }

  public recordJobRetry(): void {
    this.jobsRetried++;
  }

  public recordDlqRouted(): void {
    this.dlqJobsRouted++;
  }

  public async getSnapshot(): Promise<QueueSnapshotMetrics> {
    const [activeDepth, waitingDepth] = await Promise.all([
      this.workflowQueue.getActiveCount(),
      this.workflowQueue.getWaitingCount(),
    ]);

    const averageProcessingDurationMs =
      this.jobsProcessed > 0 ? Math.round(this.totalProcessingDurationMs / this.jobsProcessed) : 0;

    return {
      jobsProcessed: this.jobsProcessed,
      jobsFailed: this.jobsFailed,
      jobsRetried: this.jobsRetried,
      dlqJobsRouted: this.dlqJobsRouted,
      averageProcessingDurationMs,
      activeDepth,
      waitingDepth,
    };
  }
}
