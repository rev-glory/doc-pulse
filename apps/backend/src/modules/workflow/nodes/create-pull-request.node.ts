import { Injectable, Logger } from '@nestjs/common';
import { PullRequestService } from '../../github/services/pull-request.service';
import { GitOperationStatus } from '../../../domain/workflow';
import type { WorkflowGraphState } from '../graph/graph.types';

@Injectable()
export class CreatePullRequestNode {
  private readonly logger = new Logger(CreatePullRequestNode.name);

  constructor(private readonly prService: PullRequestService) {}

  async invoke(state: WorkflowGraphState): Promise<Partial<WorkflowGraphState>> {
    const runId = state.runId || 'automated';
    const headBranch = state.branchName || '';
    const repoSummary = state.repository;

    this.logger.debug(`Executing CreatePullRequestNode for run [${runId}]...`);

    if (!headBranch || !repoSummary) {
      throw new Error(`CreatePullRequestNode error: Missing branchName or repository summary in workflow state.`);
    }

    // Extract installation metadata (fallback to 0 or metadata)
    const installationId = Number(state.metadata?.installationId || 0);
    const owner = (repoSummary as any).owner || (state.metadata?.owner as string) || 'docpulse';
    const repo = repoSummary.name || 'doc-pulse';

    const prSummary = await this.prService.createPullRequest(
      installationId,
      owner,
      repo,
      headBranch,
      state as any,
    );

    this.logger.log(`CreatePullRequestNode completed successfully [PR #${prSummary.number}]`);

    // Does NOT mark workflow executionStatus as Completed.
    return {
      pullRequest: prSummary,
      pullRequestNumber: prSummary.number,
      pullRequestUrl: prSummary.url,
      gitOperationStatus: GitOperationStatus.PullRequestCreated,
    };
  }
}
