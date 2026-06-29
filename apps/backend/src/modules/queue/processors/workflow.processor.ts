import { Logger, Optional } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job, UnrecoverableError, DelayedError } from "bullmq";
import {
  QueueEventStatus,
  RealtimeWorkflowStage,
} from "@docpulse/shared-types";

import { WORKFLOW_EXECUTION_QUEUE } from "../constants/queue.constants";
import type { WorkflowJobPayload } from "../interfaces/workflow-job.interface";
import { WorkflowService } from "../../workflow/services/workflow.service";
import { WorkflowStatus, type WorkflowState } from "../../../domain/workflow";
import { QueueProgressPublisherService } from "../services/queue-progress-publisher.service";
import { QueueMetricsService } from "../services/queue-metrics.service";
import { DeadLetterService } from "../dead-letter/dead-letter.service";
import {
  classifyWorkflowError,
  QueueErrorClassification,
  DelayedRetryWorkflowError,
} from "../types/queue-errors";
import type { WorkflowProgressEvent } from "../types/progress.types";

@Processor(WORKFLOW_EXECUTION_QUEUE)
export class WorkflowProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowProcessor.name);
  private readonly workerId = `worker-${process.pid}`;

  constructor(
    private readonly workflowService: WorkflowService,
    @Optional()
    private readonly progressPublisher?: QueueProgressPublisherService,
    @Optional() private readonly metricsService?: QueueMetricsService,
    @Optional() private readonly deadLetterService?: DeadLetterService,
  ) {
    super();
  }

  /**
   * Consumes workflow execution jobs with full resiliency, observability, and DLQ routing.
   */
  public async process(
    job: Job<WorkflowJobPayload>,
    token?: string,
  ): Promise<WorkflowState> {
    const startTime = Date.now();
    const {
      repositoryId,
      repositoryPath,
      runId,
      executionMode = "start",
      metadata,
    } = job.data;
    const jobId = job.id ?? "unknown";
    const attempt = job.attemptsMade + 1;

    this.logger.log("Job started", {
      jobId,
      runId,
      repositoryId,
      executionMode,
      queue: WORKFLOW_EXECUTION_QUEUE,
      workerId: this.workerId,
      attempt,
    });

    await this.progressPublisher?.publishJobProgress(job, {
      runId,
      repositoryId,
      stage: "QUEUED",
      message: `Execution initiated on worker [${this.workerId}] (attempt ${attempt})`,
      percentage: 5,
      timestamp: new Date().toISOString(),
      queueStatus: QueueEventStatus.Active,
      realtimeStatus: "running",
      realtimeStage: RealtimeWorkflowStage.Cloning,
      metadata: { workerId: this.workerId, attempt, executionMode },
    });

    const effectiveMode =
      job.attemptsMade > 0 && executionMode === "start"
        ? "resume"
        : executionMode;

    try {
      const input = {
        runId,
        repositoryId,
        workspacePath: repositoryPath,
        metadata: metadata ?? {},
      };

      const finalState = await this.workflowService.run(input, effectiveMode);

      const durationMs = Date.now() - startTime;
      this.metricsService?.recordJobProcessed(durationMs);

      this.logger.log("Job completed", {
        jobId,
        runId,
        repositoryId,
        executionMode,
        queue: WORKFLOW_EXECUTION_QUEUE,
        workerId: this.workerId,
        attempt,
        duration: durationMs,
      });

      await this.progressPublisher?.publishJobProgress(job, {
        ...this.buildTerminalProgressEvent(
          runId,
          repositoryId,
          finalState,
          durationMs,
        ),
      });

      return finalState;
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime;
      const errorClassification = classifyWorkflowError(error);
      const isPermanent =
        errorClassification === QueueErrorClassification.PERMANENT;

      this.metricsService?.recordJobFailed(isPermanent);

      this.logger.error("Job failed", {
        jobId,
        runId,
        repositoryId,
        executionMode,
        queue: WORKFLOW_EXECUTION_QUEUE,
        workerId: this.workerId,
        attempt,
        duration: durationMs,
        classification: errorClassification,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      await this.progressPublisher?.publishJobProgress(job, {
        runId,
        repositoryId,
        stage: "FAILED",
        message: `Job terminated (${errorClassification}): ${error instanceof Error ? error.message : String(error)}`,
        percentage: 100,
        timestamp: new Date().toISOString(),
        queueStatus: QueueEventStatus.Failed,
        realtimeStatus: "failed",
        realtimeStage: RealtimeWorkflowStage.Failed,
        metadata: { durationMs, classification: errorClassification },
      });

      if (isPermanent) {
        await this.deadLetterService?.routeToDlq({
          jobId,
          queueName: WORKFLOW_EXECUTION_QUEUE,
          payload: job.data,
          error,
          attemptsMade: attempt,
        });
        this.metricsService?.recordDlqRouted();

        // Throw UnrecoverableError to tell BullMQ never to retry permanent domain failures
        throw new UnrecoverableError(
          error instanceof Error ? error.message : String(error),
        );
      }

      const delayMs = this.extractDelayMs(error);
      if (delayMs !== null && delayMs > 0) {
        this.logger.warn(
          `[${runId}] Rate limit long retry requested (${delayMs}ms). Updating executionMode to 'resume' and moving job to delayed queue.`,
        );
        await job.updateData({ ...job.data, executionMode: "resume" });
        await job.moveToDelayed(Date.now() + delayMs, token ?? job.token);
        this.metricsService?.recordJobRetry();
        throw new DelayedError();
      }

      this.metricsService?.recordJobRetry();
      throw error;
    }
  }

  private extractDelayMs(error: unknown): number | null {
    let curr: any = error;
    while (curr) {
      if (
        typeof curr.delayMs === "number" &&
        !isNaN(curr.delayMs) &&
        curr.delayMs > 0
      ) {
        return curr.delayMs;
      }
      if (curr instanceof DelayedRetryWorkflowError && curr.delayMs) {
        return curr.delayMs;
      }
      curr = curr.causeError ?? curr.cause ?? curr.workflowError;
    }
    return null;
  }

  private buildTerminalProgressEvent(
    runId: string,
    repositoryId: string,
    finalState: WorkflowState,
    durationMs: number,
  ): Omit<WorkflowProgressEvent, "jobId"> {
    switch (finalState.executionStatus) {
      case WorkflowStatus.WaitingForReview:
        return {
          runId,
          repositoryId,
          stage: "REVIEWING",
          message: "Workflow execution is waiting for human review",
          percentage: 100,
          timestamp: new Date().toISOString(),
          queueStatus: QueueEventStatus.Waiting,
          realtimeStatus: "waiting_for_review",
          realtimeStage: RealtimeWorkflowStage.Reviewing,
          metadata: { durationMs, workflowStatus: finalState.executionStatus },
        };
      case WorkflowStatus.Failed:
        return {
          runId,
          repositoryId,
          stage: "FAILED",
          message: "Workflow execution failed",
          percentage: 100,
          timestamp: new Date().toISOString(),
          queueStatus: QueueEventStatus.Failed,
          realtimeStatus: "failed",
          realtimeStage: RealtimeWorkflowStage.Failed,
          metadata: { durationMs, workflowStatus: finalState.executionStatus },
        };
      case WorkflowStatus.Completed:
      default:
        return {
          runId,
          repositoryId,
          stage: "FINISHED",
          message: "Workflow execution completed successfully",
          percentage: 100,
          timestamp: new Date().toISOString(),
          queueStatus: QueueEventStatus.Completed,
          realtimeStatus: "completed",
          realtimeStage: RealtimeWorkflowStage.Completed,
          metadata: {
            durationMs,
            workflowStatus:
              finalState.executionStatus ?? WorkflowStatus.Completed,
          },
        };
    }
  }
}
