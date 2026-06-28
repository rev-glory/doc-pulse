import { registerAs } from '@nestjs/config';

import type { Env } from './env.validation';

export interface StorageConfig {
  root: string;
  clonesDir: string;
  workspaceDir: string;
  artifactsDir: string;
  gitTimeoutMs: number;
  retentionPeriodMs: number;
}

export const storageConfig = registerAs('storage', (): StorageConfig => {
  const env = process.env as unknown as Env;

  return {
    root: env.STORAGE_ROOT,
    clonesDir: env.CLONES_DIR,
    workspaceDir: env.WORKSPACE_DIR,
    artifactsDir: env.ARTIFACTS_DIR,
    gitTimeoutMs: 5 * 60 * 1000, // 5 minutes default
    retentionPeriodMs: env.WORKSPACE_RETENTION_PERIOD_MS,
  };
});
