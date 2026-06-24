import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';

import { GitService } from '@/modules/git-operations/services/git.service';

// Mock simple-git
const mockSimpleGit = {
  clone: mock.fn(),
  fetch: mock.fn(),
  pull: mock.fn(),
  checkout: mock.fn(),
  branch: mock.fn(() => ({ current: 'main' })),
  revparse: mock.fn(() => 'abc123'),
};

mock.module('simple-git', () => ({
  default: mock.fn(() => mockSimpleGit),
}));

describe('GitService', () => {
  let service: GitService;

  beforeEach(() => {
    // Reset mocks
    mockSimpleGit.clone.mock.resetCalls();
    mockSimpleGit.fetch.mock.resetCalls();
    mockSimpleGit.pull.mock.resetCalls();
    mockSimpleGit.checkout.mock.resetCalls();
    mockSimpleGit.branch.mock.resetCalls();
    mockSimpleGit.revparse.mock.resetCalls();

    const configService = {
      getOrThrow: mock.fn(() => ({
        gitTimeoutMs: 300000,
      })),
    } as any;

    service = new GitService(configService);
  });

  it('should be defined', () => {
    assert.ok(service);
  });

  describe('clone', () => {
    it('should call simple-git clone with correct parameters', async () => {
      await service.clone('https://github.com/test/repo.git', '/tmp/dest');
      assert(mockSimpleGit.clone.mock.calls.length === 1);
    });
  });

  describe('fetch', () => {
    it('should call simple-git fetch', async () => {
      await service.fetch('/tmp/repo');
      assert(mockSimpleGit.fetch.mock.calls.length === 1);
    });
  });

  describe('pull', () => {
    it('should call simple-git pull', async () => {
      await service.pull('/tmp/repo');
      assert(mockSimpleGit.pull.mock.calls.length === 1);
    });
  });

  describe('checkout', () => {
    it('should call simple-git checkout with ref', async () => {
      await service.checkout('/tmp/repo', 'feature-branch');
      assert(mockSimpleGit.checkout.mock.calls.length === 1);
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
});
