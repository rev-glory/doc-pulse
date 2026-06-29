import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { RepositoriesService } from '../../repositories/services/repositories.service';

@Injectable()
export class WorkspaceCleanupService {
  private readonly logger = new Logger(WorkspaceCleanupService.name);

  constructor(
    private readonly workspaceService: WorkspaceService,
    @Inject(forwardRef(() => RepositoriesService))
    private readonly repositoriesService: RepositoriesService,
  ) {}

  async cleanupRepository(repositoryId: string): Promise<void> {
    this.logger.log(`Repository access revoked. Cleaning workspace for repository: ${repositoryId}`);

    // 1. Delete cloned repository directory and temporary files
    try {
      await this.workspaceService.removeRepository(repositoryId);
      this.logger.log(`Workspace deleted for repository: ${repositoryId}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete workspace directory for repository ${repositoryId}: ${error.message}`);
    }

    // 2. Remove repository metadata from the database
    try {
      await this.repositoriesService.removeRepository(repositoryId);
      this.logger.log(`Repository removed from database: ${repositoryId}`);
    } catch (error: any) {
      this.logger.error(`Failed to remove repository metadata from database for repository ${repositoryId}: ${error.message}`);
    }

    this.logger.log(`Repository cleanup completed: ${repositoryId}`);
  }
}
