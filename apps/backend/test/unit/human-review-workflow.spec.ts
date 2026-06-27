import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { HumanReviewNode } from '../../src/modules/workflow/nodes/human-review.node';
import { CreatePullRequestNode } from '../../src/modules/workflow/nodes/create-pull-request.node';
import { GitOperationsService } from '../../src/modules/git-operations/services/git-operations.service';
import { GitOperationStatus } from '../../src/domain/workflow';

describe('Human Review, Checkpoint & PR Persistence Unit Tests', () => {
  describe('HumanReviewNode', () => {
    it('should create pending review and suspend workflow if review does not exist', async () => {
      let reviewCreated = false;
      let runUpdated = false;

      const mockPrisma = {
        review: {
          findUnique: async () => null,
          create: async (args: any) => {
            reviewCreated = true;
            assert.equal(args.data.workflowRunId, 'run-123');
            assert.equal(args.data.status, 'PENDING');
            return { id: 'rev-1', status: 'PENDING', workflowRunId: 'run-123' };
          },
        },
        workflowRun: {
          update: async (args: any) => {
            runUpdated = true;
            assert.equal(args.where.id, 'run-123');
            assert.equal(args.data.status, 'RUNNING');
            return {};
          },
        },
      } as any;

      const node = new HumanReviewNode(mockPrisma);
      const state = { runId: 'run-123' } as any;

      const result = await node.invoke(state);

      assert.equal(reviewCreated, true);
      assert.equal(runUpdated, true);
      assert.equal(result.humanReviewStatus, 'PENDING');
      assert.equal('executionStatus' in result, false);
    });

    it('should continue as running if review is already APPROVED', async () => {
      const mockPrisma = {
        review: {
          findUnique: async () => ({ id: 'rev-1', status: 'APPROVED', workflowRunId: 'run-123' }),
        },
      } as any;

      const node = new HumanReviewNode(mockPrisma);
      const state = { runId: 'run-123' } as any;

      const result = await node.invoke(state);

      assert.equal(result.humanReviewStatus, 'APPROVED');
      assert.equal('executionStatus' in result, false);
    });
  });

  describe('CreatePullRequestNode Database Persistence', () => {
    it('should invoke Octokit PR creation and upsert PullRequest database record', async () => {
      let upserted = false;
      const mockPrService = {
        createPullRequest: async () => ({
          number: 99,
          url: 'https://github.com/org/repo/pull/99',
          headBranch: 'docpulse/branch',
          baseBranch: 'main',
          title: 'docs(docpulse): update docs',
          body: 'updated files description',
        }),
      } as any;

      const mockPrisma = {
        pullRequest: {
          upsert: async (args: any) => {
            upserted = true;
            assert.equal(args.where.workflowRunId, 'run-pr-123');
            assert.equal(args.create.githubPrNumber, 99);
            assert.equal(args.create.githubPrUrl, 'https://github.com/org/repo/pull/99');
            assert.equal(args.create.headBranch, 'docpulse/branch');
            assert.equal(args.create.baseBranch, 'main');
            return { id: 'db-pr-1' };
          },
        },
      } as any;

      const node = new CreatePullRequestNode(mockPrService, mockPrisma);
      const state = {
        runId: 'run-pr-123',
        branchName: 'docpulse/branch',
        repository: { name: 'repo', owner: 'org' },
        metadata: { installationId: '456' },
      } as any;

      const result = await node.invoke(state);

      assert.equal(upserted, true);
      assert.equal(result.pullRequestNumber, 99);
      assert.equal(result.pullRequestUrl, 'https://github.com/org/repo/pull/99');
      assert.equal(result.gitOperationStatus, GitOperationStatus.PullRequestCreated);
    });
  });

  describe('Git Safety Checks inside GitOperationsService', () => {
    it('should throw error when target branch is a protected branch name', async () => {
      const mockGitService = {} as any;
      const service = new GitOperationsService(mockGitService);

      await assert.rejects(
        () => service.runGitSafetyChecks('/repo', 'main'),
        /Cannot commit or push directly to protected branch/
      );
    });

    it('should throw error when git status returns conflicts', async () => {
      const mockGitService = {
        status: async () => ({
          conflicted: ['README.md'],
          modified: [],
          created: [],
          not_added: [],
          staged: [],
        }),
      } as any;
      const service = new GitOperationsService(mockGitService);

      await assert.rejects(
        () => service.runGitSafetyChecks('/repo', 'docpulse/update'),
        /Merge conflicts detected/
      );
    });

    it('should throw error when changes contain sensitive file formats', async () => {
      const mockGitService = {
        status: async () => ({
          conflicted: [],
          modified: ['src/config.json', '.env'],
          created: [],
          not_added: [],
          staged: [],
        }),
      } as any;
      const service = new GitOperationsService(mockGitService);

      await assert.rejects(
        () => service.runGitSafetyChecks('/repo', 'docpulse/update'),
        /Sensitive file detected/
      );
    });

    it('should pass checks when workspace is clean and branch is generic', async () => {
      const mockGitService = {
        status: async () => ({
          conflicted: [],
          modified: ['README.md', 'CONTRIBUTING.md'],
          created: [],
          not_added: [],
          staged: [],
        }),
      } as any;
      const service = new GitOperationsService(mockGitService);

      // Should complete without throwing
      await service.runGitSafetyChecks('/repo', 'docpulse/my-update-branch');
      assert.ok(true);
    });
  });
});
