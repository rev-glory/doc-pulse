import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';

import { GitHubApiService } from './github-api.service';
import type { GitHubRepositoryMetadata } from '../types/github.types';

// ---------------------------------------------------------------------------
// GitHubRepositoryService
//
// Owns all GitHub repository API interactions.
//
// Responsibilities:
//   • Fetch repository metadata from GitHub using an Installation Access Token
//   • Map raw GitHub API responses to the internal GitHubRepositoryMetadata type
//
// This service decouples the repositories module from the low-level
// GitHubApiService adapter. Consumer modules (e.g. RepositoriesService) should
// depend on this service — not on GitHubApiService directly.
//
// All API calls use Installation Access Tokens via GitHubApiService.
// OAuth tokens are never used here.
// ---------------------------------------------------------------------------

@Injectable()
export class GitHubRepositoryService {
  private readonly logger = new Logger(GitHubRepositoryService.name);

  constructor(private readonly gitHubApiService: GitHubApiService) {}

  /**
   * Fetch repository metadata from GitHub.
   *
   * Uses an Installation Access Token obtained via the installation's ID.
   * The caller is responsible for verifying that the user owns the installation
   * before calling this method.
   *
   * @param installationId - GitHub's integer installation ID (from the installations table)
   * @param owner          - Repository owner login (user or org)
   * @param repo           - Repository name
   *
   * @throws NotFoundException if the repository does not exist or the
   *         installation does not have access to it (GitHub returns 404).
   * @throws ForbiddenException if the installation lacks permission (403).
   */
  async fetchRepositoryMetadata(
    installationId: number,
    owner: string,
    repo: string,
  ): Promise<GitHubRepositoryMetadata> {
    this.logger.debug(`Fetching repository metadata: ${owner}/${repo} (installation: ${installationId})`);

    try {
      const octokit = await this.gitHubApiService.getInstallationClient(installationId);
      const { data } = await octokit.repos.get({ owner, repo });

      return {
        githubRepositoryId: data.id,
        owner: data.owner.login,
        name: data.name,
        fullName: data.full_name,
        defaultBranch: data.default_branch || 'main',
        isPrivate: data.private,
        description: data.description ?? null,
        language: data.language ?? null,
        cloneUrl: data.clone_url,
        htmlUrl: data.html_url,
        visibility: data.visibility ?? (data.private ? 'private' : 'public'),
      };
    } catch (error) {
      const err = error as { status?: number };

      if (err.status === 404) {
        this.logger.warn(`Repository not found on GitHub: ${owner}/${repo}`);
        throw new NotFoundException(`Repository ${owner}/${repo} not found on GitHub`);
      }

      if (err.status === 403) {
        this.logger.warn(`Installation ${installationId} lacks access to ${owner}/${repo}`);
        throw new ForbiddenException(`Installation does not have access to ${owner}/${repo}`);
      }

      this.logger.error(`Failed to fetch repository metadata: ${owner}/${repo}`, error);
      throw error;
    }
  }
}
