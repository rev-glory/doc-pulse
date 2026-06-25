import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { RUN_WORKFLOW_JOB, WORKFLOW_EXECUTION_QUEUE } from '../constants/queue.constants';
import type { WorkflowJobPayload } from '../interfaces/workflow-job.interface';

export interface EnqueuedJobMetadata {
  id: string;
  name: string;
  queueName: string;
  timestamp: number;
}

@Injectable()
export class WorkflowQueueService {
  private readonly logger = new Logger(WorkflowQueueService.name);

  constructor(
    @InjectQueue(WORKFLOW_EXECUTION_QUEUE)
    private readonly workflowQueue: Queue<WorkflowJobPayload>,
  ) {}

  /**
   * Validates payload and enqueues a workflow execution job into BullMQ.
   */
  public async enqueueWorkflow(payload: WorkflowJobPayload): Promise<EnqueuedJobMetadata> {
    this.validatePayload(payload);

    const job = await this.workflowQueue.add(RUN_WORKFLOW_JOB, payload);

    const jobId = job.id ?? 'unknown';

    this.logger.log('Job queued', {
      jobId,
      runId: payload.runId,
      repositoryId: payload.repositoryId,
      queue: WORKFLOW_EXECUTION_QUEUE,
    });

    return {
      id: jobId,
      name: job.name,
      queueName: job.queueName,
      timestamp: job.timestamp,
    };
  }

  /**
   * Lightweight runtime validation for job payload contract.
   */
  private validatePayload(payload: WorkflowJobPayload): void {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('WorkflowJobPayload must be a valid object');
    }

    if (!payload.repositoryId || typeof payload.repositoryId !== 'string' || payload.repositoryId.trim() === '') {
      throw new BadRequestException('repositoryId is required and must be a non-empty string');
    }

    if (!payload.repositoryPath || typeof payload.repositoryPath !== 'string' || payload.repositoryPath.trim() === '') {
      throw new BadRequestException('repositoryPath is required and must be a non-empty string');
    }

    if (!payload.runId || typeof payload.runId !== 'string' || payload.runId.trim() === '') {
      throw new BadRequestException('runId is required and must be a non-empty string');
    }
  }
}
