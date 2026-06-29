import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { isValidGitBranchName } from '../../src/modules/repositories/validators/branch-name.validator';
import { RepositoriesService } from '../../src/modules/repositories/services/repositories.service';
import { GitCommitNode } from '../../src/modules/workflow/nodes/git-commit.node';
import { CreatePullRequestNode } from '../../src/modules/workflow/nodes/create-pull-request.node';
import { GitOperationStatus } from '../../src/domain/workflow/enums';
import { BranchStrategy } from '@/generated/prisma/client';
import { PullRequestService } from '../../src/modules/github/services/pull-request.service';
import { GitOperationsService } from '../../src/modules/git-operations/services/git-operations.service';

describe('Custom Branch Strategy - Validator', () => {
  it('should validate branch names correctly', () => {
    assert.equal(isValidGitBranchName('main'), true);
    assert.equal(isValidGitBranchName('feature/login'), true);
    assert.equal(isValidGitBranchName('docpulse-docs'), true);
    
    // Invalid branch names
    assert.equal(isValidGitBranchName(''), false);
    assert.equal(isValidGitBranchName(' '), false);
    assert.equal(isValidGitBranchName('refs/heads/main'), false);
    assert.equal(isValidGitBranchName('refs/pull/1'), false);
    assert.equal(isValidGitBranchName('main..master'), false);
    assert.equal(isValidGitBranchName('feature/login/'), false);
    assert.equal(isValidGitBranchName('/feature'), false);
    assert.equal(isValidGitBranchName('foo//bar'), false);
    assert.equal(isValidGitBranchName('foo.lock'), false);
  });
});

describe('Custom Branch Strategy - RepositoriesService PATCH update', () => {
  it('should validate and reconcile strategies correctly', async () => {
    const mockPersistence: any = {
      findById: mock.fn(async () => ({
        id: 'repo-1',
        ownerId: 'user-1',
        branchStrategy: BranchStrategy.DOCUMENTATION_BRANCH,
        documentationBranchName: 'docpulse/docs',
        fullName: 'test/repo',
      })),
      update: mock.fn(async (id: string, data: any) => ({
        id,
        ...data,
      })),
    };

    const service = new RepositoriesService(
      mockPersistence,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    // 1. Valid PATCH of documentationBranchName
    const res1 = await service.updateRepository('repo-1', { documentationBranchName: 'valid-docs' }, { id: 'user-1' } as any);
    assert.equal(res1.documentationBranchName, 'valid-docs');

    // 2. Invalid branch name update should throw
    await assert.rejects(
      () => service.updateRepository('repo-1', { documentationBranchName: 'invalid branch' }, { id: 'user-1' } as any),
      (err: any) => err.message.includes('Invalid documentation branch name'),
    );

    // 3. DOCUMENTATION_BRANCH without branch name should throw
    await assert.rejects(
      () => service.updateRepository('repo-1', { branchStrategy: BranchStrategy.DOCUMENTATION_BRANCH, documentationBranchName: '' }, { id: 'user-1' } as any),
      (err: any) => err.message.includes('documentationBranchName is required'),
    );

    // 4. CURRENT_BRANCH strategy sets documentationBranchName to null
    const res4 = await service.updateRepository('repo-1', { branchStrategy: BranchStrategy.CURRENT_BRANCH }, { id: 'user-1' } as any);
    assert.equal(res4.branchStrategy, BranchStrategy.CURRENT_BRANCH);
    assert.equal(res4.documentationBranchName, null);
  });
});

describe('Custom Branch Strategy - GitCommitNode', () => {
  it('should commit to current branch when CURRENT_BRANCH strategy is selected', async () => {
    const mockWriter: any = {
      writeDocuments: mock.fn(async () => ({ writtenFiles: [] })),
    };
    const mockGitOps: any = {
      commitChanges: mock.fn(async (path: string, runId: string, files: string[], branch: string) => ({
        branchName: branch,
        commitSha: 'sha-commit',
      })),
    };

    const node = new GitCommitNode(mockWriter, mockGitOps);
    const state: any = {
      runId: 'run-1',
      workspacePath: '/fake/path',
      metadata: { branch: 'feature/login' },
    };

    const ctx = {
      branchStrategy: BranchStrategy.CURRENT_BRANCH,
      documentationBranchName: null,
    };

    const update = await node.invoke(state, ctx);
    assert.equal(update.targetBranch, 'feature/login');
    assert.equal(update.gitOperationStatus, GitOperationStatus.Committed);
    assert.equal(mockGitOps.commitChanges.mock.calls[0].arguments[3], 'feature/login');
  });

  it('should throw error under CURRENT_BRANCH strategy if triggering branch metadata is missing', async () => {
    const mockWriter: any = {};
    const mockGitOps: any = {};
    const node = new GitCommitNode(mockWriter, mockGitOps);
    const state: any = {
      runId: 'run-1',
      workspacePath: '/fake/path',
      metadata: {}, // missing branch
    };

    const ctx = {
      branchStrategy: BranchStrategy.CURRENT_BRANCH,
      documentationBranchName: null,
    };

    await assert.rejects(
      () => node.invoke(state, ctx),
      (err: any) => err.message.includes('Unable to determine triggering branch'),
    );
  });

  it('should commit to configured branch name under DOCUMENTATION_BRANCH strategy', async () => {
    const mockWriter: any = {
      writeDocuments: mock.fn(async () => ({ writtenFiles: [] })),
    };
    const mockGitOps: any = {
      commitChanges: mock.fn(async (path: string, runId: string, files: string[], branch: string) => ({
        branchName: branch,
        commitSha: 'sha-commit',
      })),
    };

    const node = new GitCommitNode(mockWriter, mockGitOps);
    const state: any = {
      runId: 'run-1',
      workspacePath: '/fake/path',
    };

    const ctx = {
      branchStrategy: BranchStrategy.DOCUMENTATION_BRANCH,
      documentationBranchName: 'custom-doc-branch',
    };

    const update = await node.invoke(state, ctx);
    assert.equal(update.targetBranch, 'custom-doc-branch');
    assert.equal(mockGitOps.commitChanges.mock.calls[0].arguments[3], 'custom-doc-branch');
  });
});

describe('Custom Branch Strategy - CreatePullRequestNode', () => {
  it('should bypass PR creation when CURRENT_BRANCH strategy is selected', async () => {
    const mockPrService: any = {};
    const node = new CreatePullRequestNode(mockPrService);
    const state: any = {
      runId: 'run-1',
      targetBranch: 'feature/login',
    };

    const ctx = {
      branchStrategy: BranchStrategy.CURRENT_BRANCH,
      documentationBranchName: null,
    };

    const update = await node.invoke(state, ctx);
    assert.equal(update.gitOperationStatus, GitOperationStatus.NoPullRequestRequired);
    assert.equal(update.pullRequestNumber, undefined);
  });
});

describe('Custom Branch Strategy - PullRequestService PR Reuse', () => {
  it('should reuse open PR if head and base match', async () => {
    const mockOctokit = {
      pulls: {
        list: mock.fn(async () => ({
          data: [
            { number: 42, html_url: 'pr-url', head: { ref: 'docs-branch' }, base: { ref: 'main' }, title: 'Existing' }
          ]
        })),
        create: mock.fn(),
      }
    };
    const mockGitHubApi: any = {
      getInstallationClient: mock.fn(async () => mockOctokit),
    };
    const mockTemplate: any = {};
    const service = new PullRequestService(mockGitHubApi, mockTemplate);
    mock.method(service, 'getDefaultBranch', async () => 'main');

    const pr = await service.createPullRequest(1, 'owner', 'repo', 'docs-branch', {} as any);
    assert.equal(pr.number, 42);
    assert.equal(pr.url, 'pr-url');
    assert.equal(mockOctokit.pulls.create.mock.calls.length, 0);
  });

  it('should not reuse open PR if base branch does not match', async () => {
    const mockOctokit = {
      pulls: {
        list: mock.fn(async () => ({
          data: [
            { number: 42, html_url: 'pr-url', head: { ref: 'docs-branch' }, base: { ref: 'dev' }, title: 'Existing' }
          ]
        })),
        create: mock.fn(async () => ({
          data: { number: 43, html_url: 'new-pr-url' }
        })),
      }
    };
    const mockGitHubApi: any = {
      getInstallationClient: mock.fn(async () => mockOctokit),
    };
    const mockTemplate: any = {
      generateTitle: () => 'Title',
      generateBody: () => 'Body',
    };
    const service = new PullRequestService(mockGitHubApi, mockTemplate);
    mock.method(service, 'getDefaultBranch', async () => 'main');

    const pr = await service.createPullRequest(1, 'owner', 'repo', 'docs-branch', {} as any);
    assert.equal(pr.number, 43);
    assert.equal(pr.url, 'new-pr-url');
    assert.equal(mockOctokit.pulls.create.mock.calls.length, 1);
  });
});

describe('Custom Branch Strategy - GitOperationsService Checkout Fallback', () => {
  it('should checkout and pull if local branch exists', async () => {
    const mockGit: any = {
      branchList: mock.fn(async () => ['my-branch']),
      checkout: mock.fn(async () => {}),
      pull: mock.fn(async () => {}),
      checkoutLocalBranch: mock.fn(),
      status: mock.fn(async () => ({ modified: [], not_added: [], created: [] })),
      currentCommit: mock.fn(async () => 'sha-123'),
    };
    const mockWriter: any = {};
    const service = new GitOperationsService(mockGit, mockWriter);
    mock.method(service as any, 'runGitSafetyChecks', async () => {});
    mock.method(service as any, 'logGitDiagnostics', async () => {});

    const res = await service.commitChanges('/path', 'run-1', [], 'my-branch');
    assert.equal(res.branchName, 'my-branch');
    assert.equal(mockGit.checkout.mock.calls.length, 1);
    assert.equal(mockGit.pull.mock.calls.length, 1);
    assert.equal(mockGit.checkoutLocalBranch.mock.calls.length, 0);
  });

  it('should attempt remote checkout and pull if not local, then pull', async () => {
    const mockGit: any = {
      branchList: mock.fn(async () => ['main']),
      checkout: mock.fn(async () => {}),
      pull: mock.fn(async () => {}),
      checkoutLocalBranch: mock.fn(),
      status: mock.fn(async () => ({ modified: [], not_added: [], created: [] })),
      currentCommit: mock.fn(async () => 'sha-123'),
    };
    const mockWriter: any = {};
    const service = new GitOperationsService(mockGit, mockWriter);
    mock.method(service as any, 'runGitSafetyChecks', async () => {});
    mock.method(service as any, 'logGitDiagnostics', async () => {});

    const res = await service.commitChanges('/path', 'run-1', [], 'my-branch');
    assert.equal(res.branchName, 'my-branch');
    assert.equal(mockGit.checkout.mock.calls.length, 1);
    assert.equal(mockGit.pull.mock.calls.length, 1);
    assert.equal(mockGit.checkoutLocalBranch.mock.calls.length, 0);
  });

  it('should create local branch if checkout fails (doesn\'t exist on local or remote)', async () => {
    const mockGit: any = {
      branchList: mock.fn(async () => ['main']),
      checkout: mock.fn(async () => { throw new Error('ref not found'); }),
      pull: mock.fn(async () => {}),
      checkoutLocalBranch: mock.fn(async () => {}),
      status: mock.fn(async () => ({ modified: [], not_added: [], created: [] })),
      currentCommit: mock.fn(async () => 'sha-123'),
    };
    const mockWriter: any = {};
    const service = new GitOperationsService(mockGit, mockWriter);
    mock.method(service as any, 'runGitSafetyChecks', async () => {});
    mock.method(service as any, 'logGitDiagnostics', async () => {});

    const res = await service.commitChanges('/path', 'run-1', [], 'my-branch');
    assert.equal(res.branchName, 'my-branch');
    assert.equal(mockGit.checkout.mock.calls.length, 1);
    assert.equal(mockGit.checkoutLocalBranch.mock.calls.length, 1);
  });
});
