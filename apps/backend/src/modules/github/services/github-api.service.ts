import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';

import { GitHubAuthService } from './github-auth.service';

@Injectable()
export class GitHubApiService {
  private readonly logger = new Logger(GitHubApiService.name);

  constructor(private readonly gitHubAuthService: GitHubAuthService) {}

  async getAppClient(): Promise<Octokit> {
    const jwt = await this.gitHubAuthService.getAppJwt();
    return new Octokit({ auth: jwt });
  }

  async getInstallationClient(installationId: number): Promise<Octokit> {
    const token = await this.gitHubAuthService.getInstallationAccessToken(installationId);
    return new Octokit({ auth: token });
  }
}
