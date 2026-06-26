import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GitOperationsService } from '../../src/modules/git-operations/services/git-operations.service';
import { DocumentationWriterService } from '../../src/modules/git-operations/services/documentation-writer.service';
import { PullRequestTemplateService } from '../../src/modules/github/services/pull-request-template.service';
import { CreatePullRequestNode } from '../../src/modules/workflow/nodes/create-pull-request.node';
import { GitOperationStatus } from '../../src/domain/workflow';

describe('Commit 6 – Git Operations & Pull Request Automation Unit Tests', () => {
  describe('GitOperationsService', () => {
    it('should generate sanitized branch name and handle fallback on collision', async () => {
      const mockGitService = {
        branchList: async () => ['docpulse/docs-update/run-123'],
      } as any;

      const service = new GitOperationsService(mockGitService);
      const branchName = await service.generateBranchName('/repo', 'run-123');

      assert.notEqual(branchName, 'docpulse/docs-update/run-123');
      assert.ok(branchName.startsWith('docpulse/docs-update/run-123-'));
    });

    it('should detect empty commit when tree is clean and no files to stage', async () => {
      const mockGitService = {
        branchList: async () => [],
        checkoutLocalBranch: async () => {},
        status: async () => ({ modified: [], not_added: [], created: [], staged: [] }),
        currentCommit: async () => 'sha-baseline',
      } as any;

      const service = new GitOperationsService(mockGitService);
      const res = await service.commitChanges('/repo', 'run-clean', []);

      assert.equal(res.emptyCommit, true);
      assert.equal(res.commitSha, 'sha-baseline');
      assert.equal(res.branchName, 'docpulse/docs-update/run-clean');
    });

    it('should rollback on commit failure', async () => {
      let rolledBack = false;
      const mockGitService = {
        branchList: async () => [],
        checkoutLocalBranch: async () => {},
        status: async () => ({ modified: ['file.md'], not_added: [], created: [], staged: ['file.md'] }),
        add: async () => {},
        commit: async () => { throw new Error('commit error'); },
        resetHard: async () => { rolledBack = true; },
        clean: async () => {},
      } as any;

      const service = new GitOperationsService(mockGitService);
      await assert.rejects(() => service.commitChanges('/repo', 'run-fail', ['file.md']), /commit error/);
      assert.equal(rolledBack, true);
    });
  });

  describe('PullRequestTemplateService', () => {
    it('should generate conventional commit title and rich markdown body', () => {
      const service = new PullRequestTemplateService();
      const state = {
        runId: 'workflow-999',
        repository: { name: 'awesome-lib', rootPath: '/tmp' },
        documentation: { totalFiles: 1 },
        criticReview: { score: 92, approvedCount: 3, totalDocuments: 3, passed: true },
        generatedDocuments: [
          { path: 'README.md', summary: 'Updated main readme' },
        ],
      } as any;

      const title = service.generateTitle(state);
      const body = service.generateBody(state);

      assert.equal(title, 'docs(docpulse): update automated documentation [workflow-999]');
      assert.ok(body.includes('**92/100**'));
      assert.ok(body.includes('`awesome-lib`'));
      assert.ok(body.includes('README.md'));
    });
  });

  describe('CreatePullRequestNode', () => {
    it('should create PR and update state without marking workflow executionStatus as Completed', async () => {
      const mockPrService = {
        createPullRequest: async () => ({ number: 42, url: 'https://github.com/docpulse/pr/42' }),
      } as any;

      const node = new CreatePullRequestNode(mockPrService);
      const state = {
        runId: 'run-pr',
        branchName: 'docpulse/docs-update/run-pr',
        repository: { name: 'repo', owner: 'docpulse' },
      } as any;

      const update = await node.invoke(state);

      assert.equal(update.pullRequestNumber, 42);
      assert.equal(update.pullRequestUrl, 'https://github.com/docpulse/pr/42');
      assert.equal(update.gitOperationStatus, GitOperationStatus.PullRequestCreated);
      assert.equal((update as any).executionStatus, undefined); // Verifies central lifecycle ownership rule
    });
  });
});
