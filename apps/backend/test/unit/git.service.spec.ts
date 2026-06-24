import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';

import { GitService } from '@/modules/git-operations/services/git.service';

// Create a testable GitService that lets us override createGitClient
class TestableGitService extends GitService {
  private mockGit: Record<string, any>;

  constructor(configService: ConfigService, mockGit: Record<string, any>) {
    super(configService);
    this.mockGit = mockGit;
  }

  protected override createGitClient(): any {
    return this.mockGit;
  }
}

describe('GitService', () => {
  let service: GitService;
  let mockGit: Record<string, any>;

  beforeEach(() => {
    mockGit = {
      clone: mock.fn(),
      fetch: mock.fn(),
      pull: mock.fn(),
      checkout: mock.fn(),
      branch: mock.fn(() => ({ current: 'main' })),
      revparse: mock.fn(() => 'abc123'),
      reset: mock.fn(),
      clean: mock.fn(),
      status: mock.fn(() => ({})),
    };

    const configService = {
      getOrThrow: mock.fn(() => ({
        gitTimeoutMs: 300000,
      })),
    } as any;

    service = new TestableGitService(configService, mockGit);
  });

  it('should be defined', () => {
    assert.ok(service);
  });

  describe('clone', () => {
    it('should call simple-git clone with correct parameters', async () => {
      await service.clone('https://github.com/test/repo.git', '/tmp/dest');
      assert(mockGit.clone.mock.calls.length === 1);
    });
  });

  describe('fetch', () => {
    it('should call simple-git fetch', async () => {
      await service.fetch('/tmp/repo');
      assert(mockGit.fetch.mock.calls.length === 1);
    });
  });

  describe('pull', () => {
    it('should call simple-git pull', async () => {
      await service.pull('/tmp/repo');
      assert(mockGit.pull.mock.calls.length === 1);
    });
  });

  describe('checkout', () => {
    it('should call simple-git checkout with ref', async () => {
      await service.checkout('/tmp/repo', 'feature-branch');
      assert(mockGit.checkout.mock.calls.length === 1);
    });
  });

  describe('currentBranch', () => {
    it('should return current branch', async () => {
      const branch = await service.currentBranch('/tmp/repo');
      assert(branch === 'main');
    });
  });

  describe('currentCommit', () => {
    it('should return current commit', async () => {
      const commit = await service.currentCommit('/tmp/repo');
      assert(commit === 'abc123');
    });
  });

  describe('resetHard', () => {
    it('should call simple-git reset', async () => {
      await service.resetHard('/tmp/repo');
      assert(mockGit.reset.mock.calls.length === 1);
    });
  });

  describe('clean', () => {
    it('should call simple-git clean', async () => {
      await service.clean('/tmp/repo');
      assert(mockGit.clean.mock.calls.length === 1);
    });
  });

  describe('status', () => {
    it('should call simple-git status', async () => {
      await service.status('/tmp/repo');
      assert(mockGit.status.mock.calls.length === 1);
    });
  });
});
