import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CreatePullRequestNode } from '../../src/modules/workflow/nodes/create-pull-request.node';
import { WorkflowCheckpointRepository } from '../../src/modules/workflow/persistence/workflow-checkpoint.repository';
import { RunsService } from '../../src/modules/runs/services/runs.service';
import { GitOperationStatus } from '../../src/domain/workflow/enums';

describe('Exposing PR URL - CreatePullRequestNode', () => {
  it('should return newly created PR URL and status', async () => {
    const mockPrService = {
      createPullRequest: async () => ({
        number: 45,
        url: 'https://github.com/docpulse/pr/45',
        headBranch: 'my-feature',
        baseBranch: 'main',
      }),
    } as any;

    const node = new CreatePullRequestNode(mockPrService);
    const state = {
      runId: 'run-new-pr',
      targetBranch: 'my-feature',
      repository: { name: 'repo', owner: 'org' },
    } as any;

    const res = await node.invoke(state, { branchStrategy: 'DOCUMENTATION_BRANCH' } as any);

    assert.equal(res.pullRequestNumber, 45);
    assert.equal(res.pullRequestUrl, 'https://github.com/docpulse/pr/45');
    assert.equal(res.gitOperationStatus, GitOperationStatus.PullRequestCreated);
  });

  it('should return reused PR URL and status', async () => {
    const mockPrService = {
      createPullRequest: async () => ({
        number: 42,
        url: 'https://github.com/docpulse/pr/42',
        headBranch: 'my-feature',
        baseBranch: 'main',
      }),
    } as any;

    const node = new CreatePullRequestNode(mockPrService);
    const state = {
      runId: 'run-reused-pr',
      targetBranch: 'my-feature',
      repository: { name: 'repo', owner: 'org' },
    } as any;

    const res = await node.invoke(state, { branchStrategy: 'DOCUMENTATION_BRANCH' } as any);

    assert.equal(res.pullRequestNumber, 42);
    assert.equal(res.pullRequestUrl, 'https://github.com/docpulse/pr/42');
    assert.equal(res.gitOperationStatus, GitOperationStatus.PullRequestCreated);
  });

  it('should leave pullRequestUrl undefined under CURRENT_BRANCH strategy', async () => {
    const node = new CreatePullRequestNode({} as any);
    const state = {
      runId: 'run-current-branch',
    } as any;

    const res = await node.invoke(state, { branchStrategy: 'CURRENT_BRANCH' } as any);

    assert.equal(res.pullRequestUrl, undefined);
    assert.equal(res.gitOperationStatus, GitOperationStatus.NoPullRequestRequired);
  });
});

describe('Exposing PR URL - Checkpoint Persistence', () => {
  it('should save pullRequestUrl and gitOperationStatus to WorkflowRun table columns', async () => {
    let updatedData: any = null;
    const mockPrisma: any = {
      $transaction: async (cb: any) => cb(mockPrisma),
      workflowRun: {
        findUnique: async () => ({
          version: 1,
          executionMetadata: {},
        }),
        update: async (args: any) => {
          updatedData = args.data;
          return { id: 'run-1', ...args.data };
        },
      },
    };

    const repo = new WorkflowCheckpointRepository(mockPrisma);
    await repo.saveNodeCheckpoint({
      runId: 'run-1',
      expectedVersion: 1,
      nodeName: 'CreatePullRequest' as any,
      stage: 'CREATING_PULL_REQUEST' as any,
      snapshot: {
        pullRequestUrl: 'https://github.com/docpulse/pr/42',
        gitOperationStatus: 'PullRequestCreated',
        targetBranch: 'docs-branch',
        completedNodes: [],
        executionMetadata: {},
      } as any,
      status: 'COMPLETED' as any,
      nodeRetries: {},
    });

    assert.ok(updatedData);
    assert.equal(updatedData.pullRequestUrl, 'https://github.com/docpulse/pr/42');
    assert.equal(updatedData.gitOperationStatus, 'PullRequestCreated');
    assert.equal(updatedData.targetBranch, 'docs-branch');
  });
});

describe('Exposing PR URL - Workflow API', () => {
  it('should return pullRequestUrl and gitOperationStatus directly from database mapping', async () => {
    const mockPrisma: any = {
      workflowRun: {
        findUnique: async () => ({
          id: 'run-1',
          correlationId: 'corr-1',
          commitSha: 'sha-1',
          branch: 'main',
          commitMessage: null,
          status: 'COMPLETED',
          currentStage: 'FINISHED',
          currentNode: 'CreatePullRequest',
          createdAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
          repositoryId: 'repo-1',
          errorMessage: null,
          pullRequestUrl: 'https://github.com/docpulse/pr/99',
          gitOperationStatus: 'PullRequestCreated',
          repository: {
            id: 'repo-1',
            name: 'repo',
            repositoryOwner: 'org',
            ownerId: 'user-1',
          },
        }),
      },
    };

    const service = new RunsService(mockPrisma);
    const res = await service.getRunById('run-1', { id: 'user-1' } as any);

    assert.equal(res.pullRequestUrl, 'https://github.com/docpulse/pr/99');
    assert.equal(res.gitOperationStatus, 'PullRequestCreated');
  });
});
