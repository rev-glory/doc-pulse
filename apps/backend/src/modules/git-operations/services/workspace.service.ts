import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

import type { StorageConfig } from '@/config';
import type { RepositoryWorkspace } from '../types';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);
  private readonly storageConfig: StorageConfig;
  private readonly resolvedStorageRoot: string;

  constructor(private readonly configService: ConfigService) {
    this.storageConfig = this.configService.getOrThrow<StorageConfig>('storage');
    this.resolvedStorageRoot = path.resolve(process.cwd(), this.storageConfig.root);
  }

  getWorkspace(repositoryId: string): RepositoryWorkspace {
    const repositoryPath = this.getRepositoryPath(repositoryId);
    return {
      repositoryPath,
      workspacePath: path.join(repositoryPath, this.storageConfig.workspaceDir),
      artifactsPath: path.join(repositoryPath, this.storageConfig.artifactsDir),
    };
  }

  getRepositoryPath(repositoryId: string): string {
    return path.join(
      this.resolvedStorageRoot,
      this.storageConfig.clonesDir,
      repositoryId,
    );
  }

  getWorkspacePath(repositoryId: string): string {
    return path.join(this.getRepositoryPath(repositoryId), this.storageConfig.workspaceDir);
  }

  getArtifactsPath(repositoryId: string): string {
    return path.join(this.getRepositoryPath(repositoryId), this.storageConfig.artifactsDir);
  }

  async ensureDirectories(repositoryId: string): Promise<void> {
    const { repositoryPath, workspacePath, artifactsPath } = this.getWorkspace(repositoryId);

    await fs.mkdir(repositoryPath, { recursive: true });
    await fs.mkdir(workspacePath, { recursive: true });
    await fs.mkdir(artifactsPath, { recursive: true });

    this.logger.debug(`Ensured directories for repository ${repositoryId}`);
  }

  private isPathWithinStorageRoot(targetPath: string): boolean {
    const resolvedTarget = path.resolve(targetPath);
    return resolvedTarget.startsWith(this.resolvedStorageRoot + path.sep);
  }

  async removeRepository(repositoryId: string): Promise<void> {
    const repoPath = this.getRepositoryPath(repositoryId);

    if (!this.isPathWithinStorageRoot(repoPath)) {
      this.logger.warn(`Attempted to remove repository outside storage root: ${repoPath}`);
      return;
    }

    try {
      await fs.access(repoPath);
      await fs.rm(repoPath, { recursive: true, force: true });
      this.logger.log(`Removed repository ${repositoryId} from storage`);
    } catch {
      this.logger.debug(`Repository ${repositoryId} not found, nothing to remove`);
    }
  }

  async cleanupWorkspace(repositoryId: string): Promise<void> {
    const workspacePath = this.getWorkspacePath(repositoryId);

    if (!this.isPathWithinStorageRoot(workspacePath)) {
      this.logger.warn(`Attempted to cleanup workspace outside storage root: ${workspacePath}`);
      return;
    }

    try {
      await fs.access(workspacePath);
      await fs.rm(workspacePath, { recursive: true, force: true });
    } catch {
      // No workspace to clean, just create it
    }

    await fs.mkdir(workspacePath, { recursive: true });
    this.logger.debug(`Cleaned up workspace for repository ${repositoryId}`);
  }

  async repositoryExists(repositoryId: string): Promise<boolean> {
    const workspacePath = this.getWorkspacePath(repositoryId);
    try {
      await fs.access(workspacePath);
      const gitPath = path.join(workspacePath, '.git');
      await fs.access(gitPath);
      return true;
    } catch {
      return false;
    }
  }
}
