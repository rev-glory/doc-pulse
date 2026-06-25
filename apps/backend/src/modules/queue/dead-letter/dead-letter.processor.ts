import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { WORKFLOW_DLQ_QUEUE } from '../constants/queue.constants';
import type { DlqJobRecord } from './dead-letter.service';

@Processor(WORKFLOW_DLQ_QUEUE)
export class DeadLetterProcessor extends WorkerHost {
  private readonly logger = new Logger(DeadLetterProcessor.name);

  public async process(job: Job<DlqJobRecord>): Promise<void> {
    this.logger.log('DLQ Job received and cataloged (Replay APIs disabled for initial MVP)', {
      dlqJobId: job.id,
      originalJobId: job.data.originalJobId,
      runId: job.data.payload.runId,
      repositoryId: job.data.payload.repositoryId,
      failureReason: job.data.failureReason,
      failedAt: job.data.failedAt,
    });
  }
}
