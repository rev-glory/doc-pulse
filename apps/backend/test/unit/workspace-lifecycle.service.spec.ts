import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

import { WorkspaceLifecycleService } from "../../src/modules/git-operations/services/workspace-lifecycle.service";

describe("WorkspaceLifecycleService", () => {
  let service: WorkspaceLifecycleService;
  let mockPrisma: any;
  let mockWorkspaceService: any;
  let mockRepositoryCloneService: any;
  let mockLockService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockPrisma = {
      repository: {
        findUnique: mock.fn(),
      },
      workflowRun: {
        findMany: mock.fn(),
      },
    };

    mockWorkspaceService = {
      repositoryExists: mock.fn(),
      getWorkspacePath: mock.fn(),
      getClonedRepositoryIds: mock.fn(),
      removeRepository: mock.fn(),
    };

    mockRepositoryCloneService = {
      deleteClone: mock.fn(),
    };

    mockLockService = {
      acquireLock: mock.fn(async () => () => {}),
    };

    mockConfigService = {
      getOrThrow: mock.fn(() => ({
        retentionPeriodMs: 60 * 60 * 1000, // 1 hour for testing
      })),
    };

    service = new WorkspaceLifecycleService(
      mockPrisma,
      mockWorkspaceService,
      mockRepositoryCloneService,
      mockLockService as any,
      mockConfigService,
    );
  });

  it("should check if workspace exists", async () => {
    mockWorkspaceService.repositoryExists.mock.mockImplementation(
      async (repoId: string) => {
        assert.equal(repoId, "repo-123");
        return true;
      },
    );

    const exists = await service.workspaceExists("repo-123");
    assert.equal(exists, true);
  });

  it("should get workspace path", () => {
    mockWorkspaceService.getWorkspacePath.mock.mockImplementation(
      (repoId: string) => {
        assert.equal(repoId, "repo-123");
        return "/tmp/repo-123";
      },
    );

    const path = service.getWorkspacePath("repo-123");
    assert.equal(path, "/tmp/repo-123");
  });

  it("should delete workspace", async () => {
    mockLockService.acquireLock.mock.mockImplementation(
      async (repoId: string) => {
        assert.equal(repoId, "repo-123");
        return () => {};
      },
    );
    mockWorkspaceService.removeRepository.mock.mockImplementation(
      async (repoId: string) => {
        assert.equal(repoId, "repo-123");
      },
    );

    await service.deleteWorkspace("repo-123");
    assert.equal(mockLockService.acquireLock.mock.calls.length, 1);
    assert.equal(mockWorkspaceService.removeRepository.mock.calls.length, 1);
  });

  describe("shouldCleanup", () => {
    it("should return true when there are no active workflow runs", async () => {
      mockPrisma.workflowRun.findMany.mock.mockImplementation(
        async (query: any) => {
          assert.deepEqual(query.where.status.in, [
            "QUEUED",
            "RUNNING",
            "CHECKPOINTED",
            "WAITING_FOR_REVIEW",
          ]);
          return [];
        },
      );

      const shouldClean = await service.shouldCleanup("repo-123");
      assert.equal(shouldClean, true);
    });

    it("should return false when there are active workflow runs", async () => {
      mockPrisma.workflowRun.findMany.mock.mockImplementation(async () => {
        return [{ id: "run-1", status: "RUNNING" }];
      });

      const shouldClean = await service.shouldCleanup("repo-123");
      assert.equal(shouldClean, false);
    });
  });

  describe("cleanupExpiredWorkspaces", () => {
    it("should delete disconnected repository workspace", async () => {
      mockWorkspaceService.getClonedRepositoryIds.mock.mockImplementation(
        async () => ["repo-disconnected"],
      );
      mockPrisma.repository.findUnique.mock.mockImplementation(
        async () => null,
      );

      await service.cleanupExpiredWorkspaces();

      assert.equal(mockWorkspaceService.removeRepository.mock.calls.length, 1);
      assert.equal(
        mockWorkspaceService.removeRepository.mock.calls[0].arguments[0],
        "repo-disconnected",
      );
    });

    it("should delete workspace if there are no workflow runs", async () => {
      mockWorkspaceService.getClonedRepositoryIds.mock.mockImplementation(
        async () => ["repo-no-runs"],
      );
      mockPrisma.repository.findUnique.mock.mockImplementation(async () => ({
        id: "repo-no-runs",
      }));
      mockPrisma.workflowRun.findMany.mock.mockImplementation(async () => []);

      await service.cleanupExpiredWorkspaces();

      assert.equal(mockWorkspaceService.removeRepository.mock.calls.length, 1);
      assert.equal(
        mockWorkspaceService.removeRepository.mock.calls[0].arguments[0],
        "repo-no-runs",
      );
    });

    it("should delete workspace if all workflows are completed and expired", async () => {
      mockWorkspaceService.getClonedRepositoryIds.mock.mockImplementation(
        async () => ["repo-expired"],
      );
      mockPrisma.repository.findUnique.mock.mockImplementation(async () => ({
        id: "repo-expired",
      }));

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      mockPrisma.workflowRun.findMany.mock.mockImplementation(async () => [
        { id: "run-1", status: "COMPLETED", updatedAt: twoHoursAgo },
      ]);

      await service.cleanupExpiredWorkspaces();

      assert.equal(mockWorkspaceService.removeRepository.mock.calls.length, 1);
      assert.equal(
        mockWorkspaceService.removeRepository.mock.calls[0].arguments[0],
        "repo-expired",
      );
    });

    it("should not delete workspace if all workflows are completed but NOT expired", async () => {
      mockWorkspaceService.getClonedRepositoryIds.mock.mockImplementation(
        async () => ["repo-not-expired"],
      );
      mockPrisma.repository.findUnique.mock.mockImplementation(async () => ({
        id: "repo-not-expired",
      }));

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      mockPrisma.workflowRun.findMany.mock.mockImplementation(async () => [
        { id: "run-1", status: "COMPLETED", updatedAt: tenMinutesAgo },
      ]);

      await service.cleanupExpiredWorkspaces();

      assert.equal(mockWorkspaceService.removeRepository.mock.calls.length, 0);
    });

    it("should delete workspace if active run is expired (abandoned)", async () => {
      mockWorkspaceService.getClonedRepositoryIds.mock.mockImplementation(
        async () => ["repo-abandoned"],
      );
      mockPrisma.repository.findUnique.mock.mockImplementation(async () => ({
        id: "repo-abandoned",
      }));

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      mockPrisma.workflowRun.findMany.mock.mockImplementation(async () => [
        { id: "run-1", status: "RUNNING", updatedAt: twoHoursAgo },
      ]);

      await service.cleanupExpiredWorkspaces();

      assert.equal(mockWorkspaceService.removeRepository.mock.calls.length, 1);
      assert.equal(
        mockWorkspaceService.removeRepository.mock.calls[0].arguments[0],
        "repo-abandoned",
      );
    });
  });
});
