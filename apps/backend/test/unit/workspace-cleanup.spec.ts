import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import * as fsPromises from 'node:fs/promises';
import fs from 'node:fs';
import { deleteDirectoryIfExists } from '../../src/modules/git-operations/utils/fs.util';
import { WorkspaceCleanupService } from '../../src/modules/git-operations/services/workspace-cleanup.service';
import { GitHubWebhookService } from '../../src/modules/github/services/github-webhook.service';
import { WorkflowNodeExecutionWrapper } from '../../src/modules/workflow/graph/workflow-node-execution.wrapper';
import { ConflictException } from '@nestjs/common';
import { WorkflowExecutorService } from '../../src/modules/workflow/graph/workflow-executor.service';
import { WorkflowNodeName } from '../../src/domain/workflow';

describe('Repository Cleanup - deleteDirectoryIfExists utility', () => {
  it('should ignore missing directory (ENOENT) silently', async () => {
    const nonExistentPath = path.join(process.cwd(), 'non-existent-directory-xyz');
    await deleteDirectoryIfExists(nonExistentPath);
    assert.ok(true, 'ENOENT was ignored successfully');
  });

  it('should retry transient errors and eventually succeed or throw', async () => {
    let callCount = 0;
    const testDir = path.join(process.cwd(), 'temp-test-retry-dir');
    await fsPromises.mkdir(testDir, { recursive: true });

    // Mock fs.promises.rm using node:test mock.method
    mock.method(fs.promises, 'rm', async (p: string, options: any) => {
      callCount++;
      if (callCount < 3) {
        throw { code: 'EBUSY', message: 'locked' };
      }
      // Call standard fsPromises.rm logic underneath (deleting directory)
      mock.restoreAll();
      return fsPromises.rm(p, options);
    });

    try {
      await deleteDirectoryIfExists(testDir, 4, 10);
      assert.equal(callCount, 3);
    } finally {
      mock.restoreAll();
      await fsPromises.rm(testDir, { recursive: true, force: true }).catch(() => {});
    }
  });
});

describe('Repository Cleanup - WorkspaceCleanupService', () => {
  it('should call workspace deletion and database row removal in correct order', async () => {
    const order: string[] = [];
    const mockWorkspaceService = {
      removeRepository: async (id: string) => {
        order.push(`workspace-${id}`);
      },
    } as any;

    const mockRepositoriesService = {
      removeRepository: async (id: string) => {
        order.push(`db-${id}`);
      },
    } as any;

    const cleanupService = new WorkspaceCleanupService(mockWorkspaceService, mockRepositoriesService);
    await cleanupService.cleanupRepository('repo-1');

    assert.deepEqual(order, ['workspace-repo-1', 'db-repo-1']);
  });

  it('should remain successful when both workspace directory and DB record are absent (full idempotency)', async () => {
    const mockWorkspaceService = {
      removeRepository: async () => {
        throw new Error('Directory missing or locked');
      },
    } as any;

    const mockRepositoriesService = {
      removeRepository: async () => {
        throw new Error('Prisma record not found');
      },
    } as any;

    const cleanupService = new WorkspaceCleanupService(mockWorkspaceService, mockRepositoriesService);
    // Should catch the errors internally and print logs without throwing
    await cleanupService.cleanupRepository('repo-absent');
    assert.ok(true, 'Full idempotency verified');
  });
});

describe('Repository Cleanup - Webhook Handlers', () => {
  it('should clean all installation repositories in parallel when installation is deleted', async () => {
    const cleanedIds: string[] = [];
    const mockCleanupService = {
      cleanupRepository: async (id: string) => {
        cleanedIds.push(id);
      },
    } as any;

    const mockPrisma = {
      webhookEvent: { create: async () => {} },
      installation: {
        findUnique: async () => ({
          id: 'inst-1',
          repositories: [{ id: 'repo-A' }, { id: 'repo-B' }],
        }),
      },
    } as any;

    const mockWebhookEventsService = {
      createEvent: async () => {},
      markAsProcessed: async () => {},
      markAsFailed: async () => {},
    } as any;

    const webhookService = new GitHubWebhookService(
      { get: () => ({ webhookSecret: 'secret' }) } as any,
      mockPrisma,
      mockWebhookEventsService,
      { handleInstallationDeleted: async () => {} } as any,
      { syncInstallationRepositoriesFromWebhook: async () => {} } as any,
      {} as any,
      {} as any,
      mockCleanupService,
    );

    await webhookService.handleEvent('installation', 'delivery-1', {
      action: 'deleted',
      installation: { id: 123 },
    });

    assert.ok(cleanedIds.includes('repo-A'));
    assert.ok(cleanedIds.includes('repo-B'));
    assert.equal(cleanedIds.length, 2);
  });

  it('should clean only specified repositories in parallel on installation_repositories.removed event', async () => {
    const cleanedIds: string[] = [];
    const mockCleanupService = {
      cleanupRepository: async (id: string) => {
        cleanedIds.push(id);
      },
    } as any;

    const mockPrisma = {
      webhookEvent: { create: async () => {} },
      repository: {
        findUnique: async (args: any) => {
          if (args.where.githubRepositoryId === 99) return { id: 'repo-99' };
          return null;
        },
      },
    } as any;

    const mockWebhookEventsService = {
      createEvent: async () => {},
      markAsProcessed: async () => {},
      markAsFailed: async () => {},
    } as any;

    const webhookService = new GitHubWebhookService(
      { get: () => ({ webhookSecret: 'secret' }) } as any,
      mockPrisma,
      mockWebhookEventsService,
      {} as any,
      { syncInstallationRepositoriesFromWebhook: async () => {} } as any,
      {} as any,
      {} as any,
      mockCleanupService,
    );

    await webhookService.handleEvent('installation_repositories', 'delivery-2', {
      action: 'removed',
      repositories_removed: [{ id: 99 }, { id: 100 }],
    });

    assert.deepEqual(cleanedIds, ['repo-99']);
  });
});

describe('Repository Cleanup - Workflow Safety & Termination', () => {
  it('should terminate active workflow immediately if repository access is deleted mid-execution', async () => {
    let markedFailed = false;
    const mockPrisma = {
      repository: {
        findUnique: async () => null, // Repo deleted
      },
    } as any;

    const mockCheckpointRepo = {
      markRunFailed: async (runId: string, reason: string) => {
        markedFailed = true;
        assert.equal(runId, 'run-1');
        assert.equal(reason, 'Repository access revoked.');
      },
    } as any;

    const wrapper = new WorkflowNodeExecutionWrapper(mockCheckpointRepo, mockPrisma);
    const state = {
      runId: 'run-1',
      repositoryId: 'repo-1',
    } as any;

    await assert.rejects(
      async () => {
        await wrapper.executeNode(
          WorkflowNodeName.RepositoryAnalyzer,
          'CLONING' as any,
          state,
          { completedNodes: [] } as any,
          async () => ({}),
        );
      },
      (err: Error) => err.message === 'Repository access revoked.',
    );

    assert.ok(markedFailed, 'Workflow run was marked as failed');
  });

  it('should throw ConflictException if repository is missing before start or resume', async () => {
    const mockPrisma = {
      repository: {
        findUnique: async () => null, // Repo deleted
      },
    } as any;

    const mockWorkspaceLifecycleService = {
      workspaceExists: async () => false,
    } as any;

    const executor = new WorkflowExecutorService(
      {} as any,
      { get: () => 80 } as any,
      {
        initializeRun: async () => ({ version: 1 }),
        loadRunRecord: async () => ({ status: 'RUNNING', version: 1, repositoryId: 'repo-1' }),
      } as any,
      mockPrisma,
      {} as any,
      mockWorkspaceLifecycleService,
    );

    // Call onModuleInit to construct the graph successfully
    executor.onModuleInit();

    await assert.rejects(
      async () => {
        await executor.start({ runId: 'run-1', repositoryId: 'repo-1', workspacePath: '/tmp' });
      },
      (err: any) => err instanceof ConflictException && err.message === 'Repository access revoked.',
    );

    await assert.rejects(
      async () => {
        await executor.resume({ runId: 'run-1', repositoryId: 'repo-1', workspacePath: '/tmp' });
      },
      (err: any) => err instanceof ConflictException && err.message === 'Repository access revoked.',
    );
  });
});
