// ---------------------------------------------------------------------------
// Config barrel — import all configuration from a single entry point.
//
// Usage:
//   import { appConfig, AppConfig } from '@/config';
//   import { validateEnv, Env } from '@/config';
// ---------------------------------------------------------------------------

export { aiConfig } from './ai.config';
export type { AiConfig } from './ai.config';

export { geminiConfig } from './gemini.config';
export type { GeminiConfig } from './gemini.config';

export { appConfig } from './app.config';
export type { AppConfig } from './app.config';

export { databaseConfig } from './database.config';
export type { DatabaseConfig } from './database.config';

export { githubConfig } from './github.config';
export type { GitHubConfig } from './github.config';

export { jwtConfig } from './jwt.config';
export type { JwtConfig } from './jwt.config';

export { notificationConfig } from './notification.config';
export type { NotificationConfig } from './notification.config';

export { queueConfig, QUEUE_NAMES } from './queue.config';
export type { QueueConfig, QueueName } from './queue.config';

export { redisConfig } from './redis.config';
export type { RedisConfig } from './redis.config';

export { storageConfig } from './storage.config';
export type { StorageConfig } from './storage.config';

export { workflowConfig } from './workflow.config';
export type { WorkflowConfig } from './workflow.config';

export { validateEnv } from './env.validation';
export type { Env } from './env.validation';
