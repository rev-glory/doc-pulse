import { Injectable, Logger, Optional } from '@nestjs/common';
import { PullRequestService } from '../../github/services/pull-request.service';
import { GitOperationStatus } from '../../../domain/workflow';
import { PrismaService } from '@/database';
import type { WorkflowGraphState } from '../graph/graph.types';

@Injectable()
export class CreatePullRequestNode {
  private readonly logger = new Logger(CreatePullRequestNode.name);

  constructor(
    private readonly prService: PullRequestService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async invoke(state: WorkflowGraphState): Promise<Partial<WorkflowGraphState>> {
    const runId = state.runId || 'automated';
    const headBranch = state.branchName || '';
    const repoSummary = state.repository;

    this.logger.debug(`Executing CreatePullRequestNode for run [${runId}]...`);

    if (!headBranch || !repoSummary) {
      throw new Error(`CreatePullRequestNode error: Missing branchName or repository summary in workflow state.`);
    }

    // Extract installation metadata (fallback to 0 or metadata)
    let installationId = Number(state.metadata?.installationId || 0);
    let owner = (repoSummary as any).owner || (state.metadata?.owner as string) || 'docpulse';
    let repo = repoSummary.name || 'doc-pulse';

    if (this.prisma && this.prisma.repository) {
      const dbRepo = await this.prisma.repository.findUnique({
        where: { id: state.repositoryId },
      });
      if (dbRepo) {
        owner = dbRepo.repositoryOwner;
        repo = dbRepo.name;
        if (dbRepo.installationId) {
          installationId = Number(dbRepo.installationId);
        }
      }
    }

    const prSummary = await this.prService.createPullRequest(
      installationId,
      owner,
      repo,
      headBranch,
      state as any,
    );

    // Save/Persist the Pull Request details to the database if prisma is provided
    if (this.prisma) {
      const dbPr = await this.prisma.pullRequest.upsert({
        where: { workflowRunId: runId },
        update: {
          githubPrNumber: prSummary.number,
          githubPrUrl: prSummary.url,
          title: prSummary.title || `docs(docpulse): update automated documentation [${runId}]`,
          body: prSummary.body || '',
          headBranch: prSummary.headBranch || headBranch,
          baseBranch: prSummary.baseBranch || 'main',
        },
        create: {
          workflowRunId: runId,
          githubPrNumber: prSummary.number,
          githubPrUrl: prSummary.url,
          title: prSummary.title || `docs(docpulse): update automated documentation [${runId}]`,
          body: prSummary.body || '',
          headBranch: prSummary.headBranch || headBranch,
          baseBranch: prSummary.baseBranch || 'main',
        },
      });
      this.logger.log(`CreatePullRequestNode completed successfully [PR #${prSummary.number}, DB ID: ${dbPr.id}]`);
    } else {
      this.logger.log(`CreatePullRequestNode completed successfully [PR #${prSummary.number}] (Prisma persistence bypassed)`);
    }

    // Does NOT mark workflow executionStatus as Completed.
    return {
      pullRequest: prSummary,
      pullRequestNumber: prSummary.number,
      pullRequestUrl: prSummary.url,
      gitOperationStatus: GitOperationStatus.PullRequestCreated,
    };
  }
}
