import { registerAs } from '@nestjs/config';

import type { Env } from './env.validation';

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
  DOCUMENTATION_SYNC: 'documentation-sync',
  PR_CREATION: 'pr-creation',
  NOTIFICATIONS: 'notifications',
  WORKFLOW_EXECUTION: 'workflow-execution',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface QueueConfig {
  concurrency: number;
  maxRetries: number;
  retryDelayMs: number;
  names: typeof QUEUE_NAMES;
}

export const queueConfig = registerAs('queue', (): QueueConfig => {
  const env = process.env as unknown as Env;

  return {
    concurrency: Number(env.QUEUE_CONCURRENCY),
    maxRetries: Number(env.QUEUE_MAX_RETRIES),
    retryDelayMs: Number(env.QUEUE_RETRY_DELAY_MS),
    names: QUEUE_NAMES,
  };
});
