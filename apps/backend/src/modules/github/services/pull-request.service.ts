import { Injectable, Logger } from '@nestjs/common';
import { GitHubApiService } from './github-api.service';
import { PullRequestTemplateService } from './pull-request-template.service';
import type { WorkflowState, PullRequestSummary } from '@/domain/workflow';

@Injectable()
export class PullRequestService {
  private readonly logger = new Logger(PullRequestService.name);

  constructor(
    private readonly gitHubApiService: GitHubApiService,
    private readonly templateService: PullRequestTemplateService,
  ) {}

  /**
   * Discovers the repository default branch (e.g., 'main' or 'master').
   */
  async getDefaultBranch(installationId: number, owner: string, repo: string): Promise<string> {
    try {
      const metadata = await this.gitHubApiService.getRepository(installationId, owner, repo);
      return metadata.default_branch || 'main';
    } catch (error) {
      this.logger.warn(`Failed to discover default branch for [${owner}/${repo}]. Defaulting to 'main'.`, (error as Error).message);
      return 'main';
    }
  }

  /**
   * Automates creation of a GitHub Pull Request for the generated documentation.
   */
  async createPullRequest(
    installationId: number,
    owner: string,
    repo: string,
    headBranch: string,
    state: WorkflowState,
  ): Promise<PullRequestSummary> {
    const startTime = Date.now();
    this.logger.debug(`Creating Pull Request on [${owner}/${repo}] from [${headBranch}]...`);

    try {
      const octokit = await this.gitHubApiService.getInstallationClient(installationId);
      const baseBranch = await this.getDefaultBranch(installationId, owner, repo);

      const title = this.templateService.generateTitle(state);
      const body = this.templateService.generateBody(state);

      const response = await octokit.pulls.create({
        owner,
        repo,
        title,
        body,
        head: headBranch,
        base: baseBranch,
      });

      const prNumber = response.data.number;
      const prUrl = response.data.html_url;
      const durationMs = Date.now() - startTime;

      this.logger.log({
        event: 'pull_request_created',
        owner,
        repo,
        pullRequestNumber: prNumber,
        pullRequestUrl: prUrl,
        durationMs,
      });

      return {
        number: prNumber,
        url: prUrl,
      };
    } catch (error: any) {
      this.logger.error(`GitHub API Pull Request creation failed for [${owner}/${repo}]: ${error.message}`);
      if (error.status === 422) {
        throw new Error(`Pull Request creation rejected (422): Branch might already have an open PR or no diff exists.`);
      }
      if (error.status === 403 || error.status === 401) {
        throw new Error(`GitHub App permission denied (${error.status}): Ensure 'Pull requests: write' permission is granted.`);
      }
      throw error;
    }
  }
}
