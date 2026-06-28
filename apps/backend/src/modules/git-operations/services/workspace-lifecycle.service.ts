import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database';
import { WorkspaceService } from './workspace.service';
import { RepositoryCloneService } from './repository-clone.service';
import { RepositoryLockService } from './repository-lock.service';
import type { StorageConfig } from '@/config';

@Injectable()
export class WorkspaceLifecycleService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkspaceLifecycleService.name);
  private readonly storageConfig: StorageConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceService: WorkspaceService,
    private readonly repositoryCloneService: RepositoryCloneService,
    private readonly lockService: RepositoryLockService,
    private readonly configService: ConfigService,
  ) {
    this.storageConfig = this.configService.getOrThrow<StorageConfig>('storage');
  }

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Executing workspace cleanup on application bootstrap...');
    try {
      await this.cleanupExpiredWorkspaces();
    } catch (error) {
      this.logger.error('Failed to clean up expired workspaces on bootstrap:', error);
    }
  }

  async workspaceExists(repositoryId: string): Promise<boolean> {
    return this.workspaceService.repositoryExists(repositoryId);
  }

  getWorkspacePath(repositoryId: string): string {
    return this.workspaceService.getWorkspacePath(repositoryId);
  }

  async deleteWorkspace(repositoryId: string): Promise<void> {
    this.logger.log(`Deleting workspace for repository [${repositoryId}]`);
    const releaseLock = await this.lockService.acquireLock(repositoryId);
    try {
      await this.workspaceService.removeRepository(repositoryId);
    } finally {
      releaseLock();
    }
  }

  async shouldCleanup(repositoryId: string): Promise<boolean> {
    const activeRuns = await this.prisma.workflowRun.findMany({
      where: {
        repositoryId,
        status: {
          in: ['QUEUED', 'RUNNING', 'CHECKPOINTED', 'WAITING_FOR_REVIEW'],
        },
      },
    });
    return activeRuns.length === 0;
  }

  async cleanupExpiredWorkspaces(): Promise<void> {
    const clonedRepoIds = await this.workspaceService.getClonedRepositoryIds();
    const now = Date.now();
    const retentionPeriodMs = this.storageConfig.retentionPeriodMs;

    for (const repositoryId of clonedRepoIds) {
      try {
        // Acquire the repository lock first to prevent races with newly started workflows
        const releaseLock = await this.lockService.acquireLock(repositoryId);
        try {
          // 1. Check if the repository was disconnected
          const repository = await this.prisma.repository.findUnique({
            where: { id: repositoryId },
          });

          if (!repository) {
            this.logger.log(`Workspace [${repositoryId}] is orphaned: repository was disconnected.`);
            await this.workspaceService.removeRepository(repositoryId);
            continue;
          }

          // 2. Check if the workflow runs exist
          const workflowRuns = await this.prisma.workflowRun.findMany({
            where: { repositoryId },
          });

          if (workflowRuns.length === 0) {
            this.logger.log(`Workspace [${repositoryId}] is orphaned: no workflow runs exist.`);
            await this.workspaceService.removeRepository(repositoryId);
            continue;
          }

          // 3. Find the latest update time of all runs and check if any are active
          let latestUpdatedAt = 0;
          let hasActiveRuns = false;

          for (const run of workflowRuns) {
            const runUpdatedAt = new Date(run.updatedAt).getTime();
            if (runUpdatedAt > latestUpdatedAt) {
              latestUpdatedAt = runUpdatedAt;
            }

            const isTerminal = run.status === 'COMPLETED' || run.status === 'FAILED' || run.status === 'CANCELLED';
            if (!isTerminal) {
              hasActiveRuns = true;
            }
          }

          const ageMs = Date.now() - latestUpdatedAt;
          const isExpired = ageMs > retentionPeriodMs;

          if (isExpired) {
            if (hasActiveRuns) {
              this.logger.log(
                `Cleaning up expired workspace [${repositoryId}]: Exceeded retention period of ${retentionPeriodMs}ms with abandoned runs (inactive for ${Math.round(ageMs / 1000 / 60)} minutes).`,
              );
            } else {
              this.logger.log(
                `Cleaning up expired workspace [${repositoryId}]: All workflows completed long ago (inactive for ${Math.round(ageMs / 1000 / 60)} minutes).`,
               );
            }
            await this.workspaceService.removeRepository(repositoryId);
          }
        } finally {
          releaseLock();
        }
      } catch (error) {
        this.logger.error(`Error processing workspace cleanup for repository [${repositoryId}]:`, error);
      }
    }
  }
}
