import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

import { WorkspaceService } from "../../src/modules/git-operations/services/workspace.service";

describe("WorkspaceService", () => {
  let service: WorkspaceService;
  let tempStorageRoot: string;

  beforeEach(async () => {
    // Create a temporary directory for storage
    tempStorageRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "docpulse-test-"),
    );

    const configService = {
      getOrThrow: mock.fn(() => ({
        root: tempStorageRoot,
        clonesDir: "clones",
        workspaceDir: "workspace",
        artifactsDir: "artifacts",
      })),
    } as any;

    service = new WorkspaceService(configService);
  });

  afterEach(async () => {
    // Cleanup temp directory
    await fs.rm(tempStorageRoot, { recursive: true, force: true });
  });

  describe("getWorkspace", () => {
    it("should return valid RepositoryWorkspace object", () => {
      const workspace = service.getWorkspace("repo-123");
      assert.ok(workspace.repositoryPath);
      assert.ok(workspace.workspacePath);
      assert.ok(workspace.artifactsPath);
      assert(workspace.repositoryPath.includes(tempStorageRoot));
    });
  });

  describe("ensureDirectories", () => {
    it("should create all directories", async () => {
      await service.ensureDirectories("repo-123");
      const workspace = service.getWorkspace("repo-123");

      const statsRepo = await fs.stat(workspace.repositoryPath);
      const statsWorkspace = await fs.stat(workspace.workspacePath);
      const statsArtifacts = await fs.stat(workspace.artifactsPath);

      assert(statsRepo.isDirectory());
      assert(statsWorkspace.isDirectory());
      assert(statsArtifacts.isDirectory());
    });

    it("should be idempotent (callable multiple times without errors)", async () => {
      await service.ensureDirectories("repo-123");
      await service.ensureDirectories("repo-123");
      await service.ensureDirectories("repo-123");
      // Should not throw
    });
  });

  describe("repositoryExists", () => {
    it("should return false for non-existent repository", async () => {
      const exists = await service.repositoryExists("non-existent");
      assert(!exists);
    });

    it("should return true for valid git repository", async () => {
      const workspace = service.getWorkspace("repo-valid");
      await service.ensureDirectories("repo-valid");
      await fs.mkdir(path.join(workspace.workspacePath, ".git"));
      const exists = await service.repositoryExists("repo-valid");
      assert(exists);
    });
  });

  describe("cleanupWorkspace", () => {
    it("should recreate workspace directory", async () => {
      const workspace = service.getWorkspace("repo-clean");
      await service.ensureDirectories("repo-clean");

      // Create a test file in workspace
      const testFile = path.join(workspace.workspacePath, "test.txt");
      await fs.writeFile(testFile, "test content");

      await service.cleanupWorkspace("repo-clean");

      // Verify directory exists but file does not
      const stats = await fs.stat(workspace.workspacePath);
      assert(stats.isDirectory());
      await assert.rejects(fs.stat(testFile));
    });
  });

  describe("removeRepository", () => {
    it("should remove repository directory", async () => {
      await service.ensureDirectories("repo-remove");
      const repoPath = service.getRepositoryPath("repo-remove");

      await service.removeRepository("repo-remove");

      await assert.rejects(fs.stat(repoPath));
    });
  });
});
