import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { GitHubApiService } from './github-api.service';

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);

  constructor(private readonly gitHubApiService: GitHubApiService) {}

  async getInstallation(installationId: number) {
    this.logger.debug(`Fetching installation ${installationId}`);
    try {
      const appOctokit = await this.gitHubApiService.getAppClient();
      const { data } = await appOctokit.apps.getInstallation({
        installation_id: installationId,
      });
      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch installation ${installationId}`, error);
      throw new NotFoundException('Installation not found');
    }
  }

  async listInstallations() {
    this.logger.debug('Listing all installations');
    const appOctokit = await this.gitHubApiService.getAppClient();
    const { data } = await appOctokit.apps.listInstallations();
    return data;
  }
}
