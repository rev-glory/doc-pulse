import { Injectable, Logger } from "@nestjs/common";
import { Octokit } from "@octokit/rest";

import { GitHubAuthService } from "./github-auth.service";

// ---------------------------------------------------------------------------
// GitHubApiService
//
// The single point of entry for all GitHub API communication.
//
// Responsibilities:
//   • Construct authenticated Octokit instances for the two valid token types:
//       1. App JWT   → used for GitHub App management endpoints
//       2. Installation Token → used for all repository operations
//   • Single place to add retry, rate-limit, and pagination handling (future).
//
// OAuth user tokens are intentionally NOT supported here.
// All repository access must use Installation Access Tokens.
// ---------------------------------------------------------------------------

@Injectable()
export class GitHubApiService {
  private readonly logger = new Logger(GitHubApiService.name);

  constructor(private readonly gitHubAuthService: GitHubAuthService) {}

  /**
   * Return an Octokit client authenticated as the GitHub App (App JWT).
   * Use for GitHub App management endpoints (e.g. listing installations,
   * getting app metadata). Never use for repository operations.
   */
  async getAppClient(): Promise<Octokit> {
    const jwt = await this.gitHubAuthService.getAppJwt();
    return new Octokit({ auth: jwt });
  }

  /**
   * Return an Octokit client authenticated with an Installation Access Token.
   * Use for all repository operations (fetching files, creating PRs, etc.).
   * The token is cached by GitHubAuthService until near expiry.
   */
  async getInstallationClient(installationId: number): Promise<Octokit> {
    const token =
      await this.gitHubAuthService.getInstallationAccessToken(installationId);
    return new Octokit({ auth: token });
  }

  /**
   * Convenience method: fetch repository metadata using an Installation Token.
   */
  async getRepository(
    installationId: number,
    owner: string,
    repo: string,
  ): Promise<Awaited<ReturnType<Octokit["rest"]["repos"]["get"]>>["data"]> {
    const octokit = await this.getInstallationClient(installationId);
    const response = await octokit.repos.get({ owner, repo });
    return response.data;
  }
}
