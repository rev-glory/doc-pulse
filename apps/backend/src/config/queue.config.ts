import { registerAs } from "@nestjs/config";

import type { Env } from "./env.validation";

// ---------------------------------------------------------------------------
// Queue Configuration (BullMQ)
//
// Registered under the 'queue' namespace.
// Inject with: ConfigService.get<QueueConfig>('queue')
//
// Consumed by:
//   • QueueModule (BullMQ queue registration)
//   • Worker processors (concurrency, retry settings)
//
// Design note:
//   Queue names are defined here as constants to prevent typo-driven bugs
//   when referencing queues across producers and consumers.
// ---------------------------------------------------------------------------

export const QUEUE_NAMES = {
  DOCUMENTATION_SYNC: "documentation-sync",
  PR_CREATION: "pr-creation",
  NOTIFICATIONS: "notifications",
  WORKFLOW_EXECUTION: "workflow-execution",
  WORKFLOW_DLQ: "workflow-dlq",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface QueueRateLimitConfig {
  max: number;
  durationMs: number;
}

export interface QueueBackoffConfig {
  type: "exponential" | "fixed";
  delay: number;
}

export interface QueueJobCleanupPolicy {
  count: number;
}

export interface QueueConfig {
  concurrency: number;
  maxRetries: number;
  retryDelayMs: number;
  backoff: QueueBackoffConfig;
  backoffMultiplier: number;
  retryJitter: number;
  stalledIntervalMs: number;
  maxStalledCount: number;
  removeOnComplete: QueueJobCleanupPolicy;
  removeOnFail: QueueJobCleanupPolicy;
  rateLimit?: QueueRateLimitConfig;
  names: typeof QUEUE_NAMES;
}

export const queueConfig = registerAs("queue", (): QueueConfig => {
  const env = process.env as unknown as Env;

  const rateLimitMax =
    env.QUEUE_RATE_LIMIT_MAX !== undefined
      ? Number(env.QUEUE_RATE_LIMIT_MAX)
      : undefined;

  return {
    concurrency: Number(env.QUEUE_CONCURRENCY),
    maxRetries: Number(env.QUEUE_MAX_RETRIES),
    retryDelayMs: Number(env.QUEUE_RETRY_DELAY_MS),
    backoff: {
      type: env.QUEUE_BACKOFF_TYPE as "exponential" | "fixed",
      delay: Number(env.QUEUE_RETRY_DELAY_MS),
    },
    backoffMultiplier: Number(env.QUEUE_BACKOFF_MULTIPLIER),
    retryJitter: Number(env.QUEUE_RETRY_JITTER),
    stalledIntervalMs: Number(env.QUEUE_STALLED_INTERVAL_MS),
    maxStalledCount: Number(env.QUEUE_MAX_STALLED_COUNT),
    removeOnComplete: {
      count: Number(env.QUEUE_REMOVE_ON_COMPLETE_COUNT),
    },
    removeOnFail: {
      count: Number(env.QUEUE_REMOVE_ON_FAIL_COUNT),
    },
    rateLimit:
      rateLimitMax !== undefined && !Number.isNaN(rateLimitMax)
        ? {
            max: rateLimitMax,
            durationMs: Number(env.QUEUE_RATE_LIMIT_DURATION_MS),
          }
        : undefined,
    names: QUEUE_NAMES,
  };
});
