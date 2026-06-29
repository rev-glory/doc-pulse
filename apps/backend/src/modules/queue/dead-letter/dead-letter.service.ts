import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";

import { WORKFLOW_DLQ_QUEUE } from "../constants/queue.constants";
import type { WorkflowJobPayload } from "../interfaces/workflow-job.interface";

export interface DlqJobRecord {
  originalJobId: string;
  originalQueue: string;
  payload: WorkflowJobPayload;
  failureReason: string;
  stackTrace?: string;
  failedAt: string;
  attemptsMade: number;
  executionMetadata: Record<string, unknown>;
}

@Injectable()
export class DeadLetterService {
  private readonly logger = new Logger(DeadLetterService.name);

  constructor(
    @InjectQueue(WORKFLOW_DLQ_QUEUE)
    private readonly dlqQueue: Queue<DlqJobRecord>,
  ) {}

  /**
   * Routes a permanently failed or retry-exhausted workflow job to DLQ.
   */
  public async routeToDlq(params: {
    jobId: string;
    queueName: string;
    payload: WorkflowJobPayload;
    error: unknown;
    attemptsMade: number;
  }): Promise<string> {
    const failedAt = new Date().toISOString();
    const failureReason =
      params.error instanceof Error
        ? params.error.message
        : String(params.error);
    const stackTrace =
      params.error instanceof Error ? params.error.stack : undefined;

    const record: DlqJobRecord = {
      originalJobId: params.jobId,
      originalQueue: params.queueName,
      payload: params.payload,
      failureReason,
      stackTrace,
      failedAt,
      attemptsMade: params.attemptsMade,
      executionMetadata: params.payload.metadata ?? {},
    };

    const dlqJob = await this.dlqQueue.add(`dlq-${params.jobId}`, record, {
      removeOnComplete: false,
      removeOnFail: false,
    });

    const dlqJobId = dlqJob.id ?? "unknown";

    this.logger.error("Job routed to Dead Letter Queue (DLQ)", {
      dlqJobId,
      originalJobId: params.jobId,
      runId: params.payload.runId,
      repositoryId: params.payload.repositoryId,
      failureReason,
      attemptsMade: params.attemptsMade,
    });

    return dlqJobId;
  }
}
