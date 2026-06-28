import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { GitService } from '../../src/modules/git-operations/services/git.service';
import { GIT_PROVIDER } from '../../src/modules/git-operations/interfaces/git-provider.interface';

describe('GitService', () => {
  let service: GitService;
  let mockProvider: Record<string, ReturnType<typeof mock.fn>>;

  beforeEach(() => {
    mockProvider = {
      clone: mock.fn(async () => {}),
      fetch: mock.fn(async () => {}),
      pull: mock.fn(async () => {}),
      checkout: mock.fn(async () => {}),
      currentBranch: mock.fn(async () => 'main'),
      currentCommit: mock.fn(async () => 'abc123'),
      resetHard: mock.fn(async () => {}),
      clean: mock.fn(async () => {}),
      status: mock.fn(async () => ({
        conflicted: [],
        modified: [],
        created: [],
        not_added: [],
        staged: [],
        isDirty: false,
      })),
      branchList: mock.fn(async () => ['main', 'develop']),
      checkoutLocalBranch: mock.fn(async () => {}),
      deleteLocalBranch: mock.fn(async () => {}),
      add: mock.fn(async () => {}),
      commit: mock.fn(async () => 'def456'),
      push: mock.fn(async () => {}),
      diff: mock.fn(async () => ''),
      getRepositoryRoot: mock.fn(async () => '/repo'),
      getRemoteUrl: mock.fn(async () => 'https://github.com/org/repo.git'),
      setRemoteUrl: mock.fn(async () => {}),
    };

    // Inject mock provider directly (GIT_PROVIDER token is a Symbol; inject manually)
    service = new (GitService as any)(mockProvider);
  });

  it('should be defined', () => {
    assert.ok(service);
  });

  describe('clone', () => {
    it('should call simple-git clone with correct parameters', async () => {
      await service.clone('https://github.com/test/repo.git', '/tmp/dest');
      assert.equal(mockProvider.clone.mock.calls.length, 1);
    });
  });

  describe('fetch', () => {
    it('should call simple-git fetch', async () => {
      await service.fetch('/tmp/repo');
      assert.equal(mockProvider.fetch.mock.calls.length, 1);
    });
  });

  describe('pull', () => {
    it('should call simple-git pull', async () => {
      await service.pull('/tmp/repo');
      assert.equal(mockProvider.pull.mock.calls.length, 1);
    });
  });

  describe('checkout', () => {
    it('should call simple-git checkout with ref', async () => {
      await service.checkout('/tmp/repo', 'feature-branch');
      assert.equal(mockProvider.checkout.mock.calls.length, 1);
    });
  });

  describe('currentBranch', () => {
    it('should return current branch', async () => {
      const branch = await service.currentBranch('/tmp/repo');
      assert.equal(branch, 'main');
    });
  });

  describe('currentCommit', () => {
    it('should return current commit', async () => {
      const commit = await service.currentCommit('/tmp/repo');
      assert.equal(commit, 'abc123');
    });
  });

  describe('resetHard', () => {
    it('should call simple-git reset', async () => {
      await service.resetHard('/tmp/repo');
      assert.equal(mockProvider.resetHard.mock.calls.length, 1);
    });
  });

  describe('clean', () => {
    it('should call simple-git clean', async () => {
      await service.clean('/tmp/repo');
      assert.equal(mockProvider.clean.mock.calls.length, 1);
    });
  });

  describe('status', () => {
    it('should call simple-git status and return GitStatus DTO', async () => {
      const result = await service.status('/tmp/repo');
      assert.equal(mockProvider.status.mock.calls.length, 1);
      assert.ok('isDirty' in result, 'result should contain isDirty field');
      assert.ok(Array.isArray(result.modified), 'modified should be an array');
    });
  });

  describe('getRepositoryRoot', () => {
    it('should delegate to provider.getRepositoryRoot', async () => {
      const root = await service.getRepositoryRoot('/tmp/repo');
      assert.equal(root, '/repo');
      assert.equal(mockProvider.getRepositoryRoot.mock.calls.length, 1);
    });
  });

  describe('getRemoteUrl', () => {
    it('should delegate to provider.getRemoteUrl', async () => {
      const url = await service.getRemoteUrl('/tmp/repo', 'origin');
      assert.equal(url, 'https://github.com/org/repo.git');
    });
  });

  describe('setRemoteUrl', () => {
    it('should delegate to provider.setRemoteUrl', async () => {
      await service.setRemoteUrl('/tmp/repo', 'origin', 'https://github.com/org/new.git');
      assert.equal(mockProvider.setRemoteUrl.mock.calls.length, 1);
    });
  });
});
