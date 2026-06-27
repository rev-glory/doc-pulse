import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { RepositoriesService } from '../../src/modules/repositories/services/repositories.service';

describe('RepositoriesService - Synchronization & Reconciliation', () => {
  let service: RepositoriesService;
  let mockRepositoriesPersistence: any;
  let mockGitHubRepositoryService: any;
  let mockInstallationsPersistence: any;
  let mockPrisma: any;

  const mockUser = { id: 'user-123' } as any;
  const mockInstallation = {
    id: 'inst-uuid',
    installationId: 99999,
    userId: 'user-123',
  };

  beforeEach(() => {
    mockRepositoriesPersistence = {
      syncUpsert: mock.fn(async (data: any) => ({ id: `repo-${data.githubRepositoryId}`, ...data })),
    };

    mockGitHubRepositoryService = {
      listInstallationRepositories: mock.fn(),
    };

    mockInstallationsPersistence = {
      findByInstallationId: mock.fn(async (id: number) => (id === 99999 ? mockInstallation : null)),
      deactivateInstallation: mock.fn(),
    };

    mockPrisma = {
      installation: {
        update: mock.fn(),
      },
      repository: {
        findMany: mock.fn(),
        updateMany: mock.fn(),
      },
      $transaction: mock.fn(async (cb: any) => {
        if (typeof cb === 'function') {
          return cb(mockPrisma);
        }
        return cb;
      }),
    };

    service = new RepositoriesService(
      mockRepositoriesPersistence,
      mockGitHubRepositoryService,
      mockInstallationsPersistence,
      mockPrisma,
    );
  });

  it('repository added: should insert new repositories fetched from GitHub', async () => {
    mockGitHubRepositoryService.listInstallationRepositories.mock.mockImplementation(async () => [
      {
        githubRepositoryId: 101,
        owner: 'docpulse',
        name: 'repo-a',
        fullName: 'docpulse/repo-a',
        defaultBranch: 'main',
        isPrivate: false,
      },
    ]);

    mockPrisma.repository.findMany.mock.mockImplementation(async () => []);

    const result = await service.syncInstallationRepositories(99999, mockUser);

    assert.equal(result.synced, 1);
    assert.equal(result.created, 1);
    assert.equal(result.updated, 0);
    assert.equal(result.removed, 0);
    assert.equal(mockRepositoriesPersistence.syncUpsert.mock.calls.length, 1);
  });

  it('repository removed: should mark disconnected repositories inactive', async () => {
    mockGitHubRepositoryService.listInstallationRepositories.mock.mockImplementation(async () => []);

    mockPrisma.repository.findMany.mock.mockImplementation(async () => [
      {
        id: 'db-repo-1',
        githubRepositoryId: 101,
        fullName: 'docpulse/repo-a',
        isActive: true,
      },
    ]);

    const result = await service.syncInstallationRepositories(99999, mockUser);

    assert.equal(result.synced, 0);
    assert.equal(result.created, 0);
    assert.equal(result.updated, 0);
    assert.equal(result.removed, 1);
    assert.equal(mockPrisma.repository.updateMany.mock.calls.length, 1);
    const updateCall = mockPrisma.repository.updateMany.mock.calls[0].arguments[0];
    assert.deepEqual(updateCall.where.githubRepositoryId, { in: [101] });
    assert.equal(updateCall.data.isActive, false);
  });

  it('installation edited: should reconcile diff (insert new, update existing, disconnect removed)', async () => {
    mockGitHubRepositoryService.listInstallationRepositories.mock.mockImplementation(async () => [
      {
        githubRepositoryId: 102, // existing repo
        owner: 'docpulse',
        name: 'repo-b',
        fullName: 'docpulse/repo-b',
      },
      {
        githubRepositoryId: 103, // newly added repo
        owner: 'docpulse',
        name: 'repo-c',
        fullName: 'docpulse/repo-c',
      },
    ]);

    mockPrisma.repository.findMany.mock.mockImplementation(async () => [
      {
        id: 'db-repo-1',
        githubRepositoryId: 101, // removed repo
        fullName: 'docpulse/repo-a',
        isActive: true,
      },
      {
        id: 'db-repo-2',
        githubRepositoryId: 102, // existing repo
        fullName: 'docpulse/repo-b',
        isActive: true,
      },
    ]);

    const result = await service.syncInstallationRepositoriesFromWebhook(99999);

    assert.ok(result);
    assert.equal(result.synced, 2);
    assert.equal(result.created, 1); // 103 created
    assert.equal(result.updated, 1); // 102 updated
    assert.equal(result.removed, 1); // 101 disconnected
  });

  it('manual sync: manual sync call triggers full diff reconciliation', async () => {
    mockGitHubRepositoryService.listInstallationRepositories.mock.mockImplementation(async () => [
      { githubRepositoryId: 200, fullName: 'docpulse/manual-repo' },
    ]);
    mockPrisma.repository.findMany.mock.mockImplementation(async () => []);

    const result = await service.syncInstallationRepositories(99999, mockUser);

    assert.equal(result.synced, 1);
    assert.equal(result.created, 1);
  });

  it('repeated sync (idempotency): multiple consecutive syncs converge to identical state', async () => {
    const githubRepos = [
      { githubRepositoryId: 301, fullName: 'docpulse/stable-repo', owner: 'docpulse', name: 'stable-repo' },
    ];

    mockGitHubRepositoryService.listInstallationRepositories.mock.mockImplementation(async () => githubRepos);

    // First sync: DB empty
    mockPrisma.repository.findMany.mock.mockImplementationOnce(async () => []);
    const run1 = await service.syncInstallationRepositories(99999, mockUser);
    assert.equal(run1.created, 1);
    assert.equal(run1.updated, 0);

    // Second sync: DB now has stable-repo
    mockPrisma.repository.findMany.mock.mockImplementationOnce(async () => [
      { githubRepositoryId: 301, fullName: 'docpulse/stable-repo', isActive: true },
    ]);
    const run2 = await service.syncInstallationRepositories(99999, mockUser);
    assert.equal(run2.created, 0);
    assert.equal(run2.updated, 1);
    assert.equal(run2.removed, 0);
  });

  it('reactivation regression: install -> remove -> re-add reactivates existing database row without duplication', async () => {
    const repoData = {
      githubRepositoryId: 404,
      owner: 'docpulse',
      name: 'reactivate-repo',
      fullName: 'docpulse/reactivate-repo',
    };

    // Step 1: Install repository
    mockGitHubRepositoryService.listInstallationRepositories.mock.mockImplementation(async () => [repoData]);
    mockPrisma.repository.findMany.mock.mockImplementationOnce(async () => []);
    const resInstall = await service.syncInstallationRepositories(99999, mockUser);
    assert.equal(resInstall.created, 1);

    // Step 2: Remove repository from GitHub App
    mockGitHubRepositoryService.listInstallationRepositories.mock.mockImplementation(async () => []);
    mockPrisma.repository.findMany.mock.mockImplementationOnce(async () => [
      { id: 'db-row-404', githubRepositoryId: 404, fullName: 'docpulse/reactivate-repo', isActive: true },
    ]);
    const resRemove = await service.syncInstallationRepositories(99999, mockUser);
    assert.equal(resRemove.removed, 1);

    // Step 3: Add the same repository back to GitHub App
    mockGitHubRepositoryService.listInstallationRepositories.mock.mockImplementation(async () => [repoData]);
    // Reconciliation query finds the deactivated record (isActive: false)
    mockPrisma.repository.findMany.mock.mockImplementationOnce(async () => [
      { id: 'db-row-404', githubRepositoryId: 404, fullName: 'docpulse/reactivate-repo', isActive: false },
    ]);
    const resReadd = await service.syncInstallationRepositories(99999, mockUser);

    // Verify existing row is reactivated (created === 0, updated === 1) rather than duplicated
    assert.equal(resReadd.created, 0);
    assert.equal(resReadd.updated, 1);
  });
});
