import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { deleteDirectoryIfExists } from '../utils/fs.util';

import type { StorageConfig } from '@/config';
import type { RepositoryWorkspace } from '../types';

@Injectable()
export class WorkspaceService implements OnModuleInit {
  private readonly logger = new Logger(WorkspaceService.name);
  private readonly storageConfig: StorageConfig;
  private readonly resolvedStorageRoot: string;
  private readonly resolvedClonesDir: string;

  constructor(private readonly configService: ConfigService) {
    this.storageConfig = this.configService.getOrThrow<StorageConfig>('storage');
    this.resolvedStorageRoot = path.resolve(process.cwd(), this.storageConfig.root);
    this.resolvedClonesDir = path.join(this.resolvedStorageRoot, this.storageConfig.clonesDir);
  }

  async onModuleInit(): Promise<void> {
    await this.initializeStorage();
  }

  async initializeStorage(): Promise<void> {
    const directories = [
      this.resolvedStorageRoot,
      this.resolvedClonesDir,
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
      this.logger.debug(`Ensured storage directory: ${dir}`);
    }

    this.logger.log('Storage directories initialized successfully');
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
      this.resolvedClonesDir,
      repositoryId,
    );
  }

  getClonePath(repositoryId: string): string {
    return this.getRepositoryPath(repositoryId);
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
      await deleteDirectoryIfExists(repoPath);
      this.logger.log(`Removed repository ${repositoryId} from storage`);
    } catch (error: any) {
      this.logger.error(`Failed to remove repository ${repositoryId} from storage: ${error.message}`);
    }
  }

  async clearWorkspace(): Promise<void> {
    try {
      await fs.access(this.resolvedClonesDir);
      await fs.rm(this.resolvedClonesDir, { recursive: true, force: true });
      await fs.mkdir(this.resolvedClonesDir, { recursive: true });
      this.logger.log('Cleared all workspaces');
    } catch {
      this.logger.debug('Clones directory does not exist, nothing to clear');
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

  async getClonedRepositoryIds(): Promise<string[]> {
    try {
      await fs.access(this.resolvedClonesDir);
      const entries = await fs.readdir(this.resolvedClonesDir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch {
      return [];
    }
  }
}
