import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from "@nestjs/common";

import { GitHubApiService } from "./github-api.service";
import type { GitHubRepositoryMetadata } from "../types/github.types";

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
    this.logger.debug(
      `Fetching repository metadata: ${owner}/${repo} (installation: ${installationId})`,
    );

    try {
      const octokit =
        await this.gitHubApiService.getInstallationClient(installationId);
      const { data } = await octokit.repos.get({ owner, repo });

      return {
        githubRepositoryId: data.id,
        owner: data.owner.login,
        name: data.name,
        fullName: data.full_name,
        defaultBranch: data.default_branch || "main",
        isPrivate: data.private,
        description: data.description ?? null,
        language: data.language ?? null,
        cloneUrl: data.clone_url,
        htmlUrl: data.html_url,
        visibility: data.visibility ?? (data.private ? "private" : "public"),
      };
    } catch (error) {
      const err = error as { status?: number };

      if (err.status === 404) {
        this.logger.warn(`Repository not found on GitHub: ${owner}/${repo}`);
        throw new NotFoundException(
          `Repository ${owner}/${repo} not found on GitHub`,
        );
      }

      if (err.status === 403) {
        this.logger.warn(
          `Installation ${installationId} lacks access to ${owner}/${repo}`,
        );
        throw new ForbiddenException(
          `Installation does not have access to ${owner}/${repo}`,
        );
      }

      this.logger.error(
        `Failed to fetch repository metadata: ${owner}/${repo}`,
        error,
      );
      throw error;
    }
  }
  /**
   * List all repositories accessible to a GitHub App installation.
   *
   * Paginates automatically — returns every repository across all pages.
   * Uses an Installation Access Token so the caller never needs to handle
   * token acquisition.
   *
   * @param installationId - GitHub's integer installation ID
   * @returns Flat array of repository metadata for every accessible repository
   */
  async listInstallationRepositories(
    installationId: number,
  ): Promise<GitHubRepositoryMetadata[]> {
    this.logger.debug(
      `Listing repositories for installation ${installationId}`,
    );

    try {
      const octokit =
        await this.gitHubApiService.getInstallationClient(installationId);

      const PAGE_SIZE = 100; // GitHub's maximum per-page for this endpoint
      const repositories: GitHubRepositoryMetadata[] = [];
      let page = 1;

      // Paginate until GitHub returns fewer repos than the page size,
      // which signals the final page.
      while (true) {
        const { data } = await octokit.apps.listReposAccessibleToInstallation({
          per_page: PAGE_SIZE,
          page,
        });

        for (const repo of data.repositories) {
          repositories.push({
            githubRepositoryId: repo.id,
            owner: repo.owner.login,
            name: repo.name,
            fullName: repo.full_name,
            defaultBranch: repo.default_branch || "main",
            isPrivate: repo.private,
            description: repo.description ?? null,
            language: repo.language ?? null,
            cloneUrl: repo.clone_url,
            htmlUrl: repo.html_url,
            visibility:
              repo.visibility ?? (repo.private ? "private" : "public"),
          });
        }

        if (data.repositories.length < PAGE_SIZE) {
          break;
        }

        page++;
      }

      this.logger.debug(
        `Found ${repositories.length} repositories for installation ${installationId}`,
      );

      return repositories;
    } catch (error) {
      const err = error as { status?: number };

      if (err.status === 401) {
        this.logger.error(
          `Installation ${installationId} token is invalid or expired`,
        );
        throw new InternalServerErrorException(
          "GitHub installation token is invalid",
        );
      }

      this.logger.error(
        `Failed to list repositories for installation ${installationId}`,
        error,
      );
      throw error;
    }
  }
}
