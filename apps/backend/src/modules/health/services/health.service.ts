import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";

import {
  WORKFLOW_EXECUTION_QUEUE,
  WORKFLOW_DLQ_QUEUE,
} from "../../queue/constants/queue.constants";
import { QueueMetricsService } from "../../queue/services/queue-metrics.service";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectQueue(WORKFLOW_EXECUTION_QUEUE)
    private readonly workflowQueue: Queue,
    @InjectQueue(WORKFLOW_DLQ_QUEUE)
    private readonly dlqQueue: Queue,
    private readonly queueMetrics: QueueMetricsService,
  ) {}

  public async check(): Promise<{
    status: "ok" | "degraded" | "error";
    timestamp: string;
    checks: {
      redis: "ok" | "error";
      workflowQueue: "ok" | "paused" | "error";
      dlqQueue: "ok" | "paused" | "error";
    };
    metrics: Record<string, unknown>;
  }> {
    const timestamp = new Date().toISOString();
    let redisStatus: "ok" | "error" = "ok";
    let workflowQueueStatus: "ok" | "paused" | "error" = "ok";
    let dlqQueueStatus: "ok" | "paused" | "error" = "ok";

    try {
      const client = await this.workflowQueue.client;
      const ping = await (client as any).ping();
      if (ping !== "PONG") redisStatus = "error";
    } catch (err) {
      redisStatus = "error";
      this.logger.error(
        "Health check probe failed: Redis connection error",
        err,
      );
    }

    try {
      const isPaused = await this.workflowQueue.isPaused();
      workflowQueueStatus = isPaused ? "paused" : "ok";
    } catch (err) {
      workflowQueueStatus = "error";
    }

    try {
      const isPaused = await this.dlqQueue.isPaused();
      dlqQueueStatus = isPaused ? "paused" : "ok";
    } catch (err) {
      dlqQueueStatus = "error";
    }

    const snapshot = await this.queueMetrics.getSnapshot();

    const overallStatus =
      redisStatus === "error" ||
      workflowQueueStatus === "error" ||
      dlqQueueStatus === "error"
        ? "error"
        : workflowQueueStatus === "paused"
          ? "degraded"
          : "ok";

    return {
      status: overallStatus,
      timestamp,
      checks: {
        redis: redisStatus,
        workflowQueue: workflowQueueStatus,
        dlqQueue: dlqQueueStatus,
      },
      metrics: snapshot as unknown as Record<string, unknown>,
    };
  }
}
