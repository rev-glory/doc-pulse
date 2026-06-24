import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { RepositoryCloneService } from '@/modules/git-operations/services/repository-clone.service';
import {
  RepositoryAlreadyClonedException,
  RepositoryNotFoundException,
  CloneFailedException,
  PullFailedException,
  CheckoutFailedException,
} from '@/modules/git-operations/exceptions';
import type { GitRepository } from '@/modules/git-operations/types';

const testRepo: GitRepository = {
  id: 'test-repo-id',
  cloneUrl: 'https://github.com/test/repo.git',
  defaultBranch: 'main',
};

describe('RepositoryCloneService', () => {
  let service: RepositoryCloneService;
  let mockWorkspaceService: any;
  let mockGitService: any;

  beforeEach(() => {
    mockWorkspaceService = {
      ensureDirectories: mock.fn(),
      getWorkspacePath: mock.fn(() => '/tmp/repo/workspace'),
      getRepositoryPath: mock.fn(() => '/tmp/repo'),
      getArtifactsPath: mock.fn(() => '/tmp/repo/artifacts'),
      repositoryExists: mock.fn(),
      cleanupWorkspace: mock.fn(),
      removeRepository: mock.fn(),
    };

    mockGitService = {
      clone: mock.fn(),
      fetch: mock.fn(),
      pull: mock.fn(),
      checkout: mock.fn(),
    };

    service = new RepositoryCloneService(mockWorkspaceService, mockGitService);
  });

  it('should be defined', () => {
    assert.ok(service);
  });

  describe('prepareWorkspace', () => {
    it('should call ensureDirectories', async () => {
      await service.prepareWorkspace(testRepo);
      assert(mockWorkspaceService.ensureDirectories.mock.calls.length === 1);
      assert(mockWorkspaceService.ensureDirectories.mock.calls[0].arguments[0] === testRepo.id);
    });
  });

  describe('cloneRepository', () => {
    it('should throw RepositoryAlreadyClonedException if repository exists', async () => {
      mockWorkspaceService.repositoryExists.mock.mockImplementation(() => true);
      await assert.rejects(service.cloneRepository(testRepo), RepositoryAlreadyClonedException);
    });

    it('should successfully clone repository', async () => {
      mockWorkspaceService.repositoryExists.mock.mockImplementation(() => false);
      await service.cloneRepository(testRepo);
      assert(mockGitService.clone.mock.calls.length === 1);
    });

    it('should throw CloneFailedException on git error', async () => {
      mockWorkspaceService.repositoryExists.mock.mockImplementation(() => false);
      mockGitService.clone.mock.mockImplementation(() => {
        throw new Error('git clone failed');
      });
      await assert.rejects(service.cloneRepository(testRepo), CloneFailedException);
    });
  });

  describe('pullRepository', () => {
    it('should throw RepositoryNotFoundException if repository not found', async () => {
      mockWorkspaceService.repositoryExists.mock.mockImplementation(() => false);
      await assert.rejects(service.pullRepository(testRepo), RepositoryNotFoundException);
    });

    it('should successfully pull repository', async () => {
      mockWorkspaceService.repositoryExists.mock.mockImplementation(() => true);
      await service.pullRepository(testRepo);
      assert(mockGitService.fetch.mock.calls.length === 1);
      assert(mockGitService.pull.mock.calls.length === 1);
    });

    it('should throw PullFailedException on git error', async () => {
      mockWorkspaceService.repositoryExists.mock.mockImplementation(() => true);
      mockGitService.pull.mock.mockImplementation(() => {
        throw new Error('git pull failed');
      });
      await assert.rejects(service.pullRepository(testRepo), PullFailedException);
    });
  });

  describe('checkoutBranch', () => {
    it('should throw RepositoryNotFoundException if repository not found', async () => {
      mockWorkspaceService.repositoryExists.mock.mockImplementation(() => false);
      await assert.rejects(service.checkoutBranch(testRepo), RepositoryNotFoundException);
    });

    it('should checkout default branch when no branch specified', async () => {
      mockWorkspaceService.repositoryExists.mock.mockImplementation(() => true);
      await service.checkoutBranch(testRepo);
      assert(mockGitService.checkout.mock.calls[0].arguments[1] === testRepo.defaultBranch);
    });

    it('should checkout specified branch', async () => {
      mockWorkspaceService.repositoryExists.mock.mockImplementation(() => true);
      await service.checkoutBranch(testRepo, 'feature-branch');
      assert(mockGitService.checkout.mock.calls[0].arguments[1] === 'feature-branch');
    });

    it('should throw CheckoutFailedException on git error', async () => {
      mockWorkspaceService.repositoryExists.mock.mockImplementation(() => true);
      mockGitService.checkout.mock.mockImplementation(() => {
        throw new Error('git checkout failed');
      });
      await assert.rejects(service.checkoutBranch(testRepo), CheckoutFailedException);
    });
  });

  describe('cleanupWorkspace', () => {
    it('should call workspaceService.cleanupWorkspace', async () => {
      await service.cleanupWorkspace(testRepo);
      assert(mockWorkspaceService.cleanupWorkspace.mock.calls.length === 1);
    });
  });

  describe('removeRepository', () => {
    it('should call workspaceService.removeRepository', async () => {
      await service.removeRepository(testRepo);
      assert(mockWorkspaceService.removeRepository.mock.calls.length === 1);
    });
  });
});
