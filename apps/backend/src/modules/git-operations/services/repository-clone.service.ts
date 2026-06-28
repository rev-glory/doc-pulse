import { Injectable, Logger } from '@nestjs/common';

import type { GitRepository } from '../types';

import {
  CheckoutFailedException,
  CloneFailedException,
  PullFailedException,
  RepositoryAlreadyClonedException,
  RepositoryNotFoundException,
} from '../exceptions';
import { GitService } from './git.service';
import { WorkspaceService } from './workspace.service';
import { RepositoryLockService } from './repository-lock.service';

@Injectable()
export class RepositoryCloneService {
  private readonly logger = new Logger(RepositoryCloneService.name);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly gitService: GitService,
    private readonly lockService: RepositoryLockService,
  ) {}

  async prepareWorkspace(repository: GitRepository): Promise<void> {
    const startTime = Date.now();
    await this.workspaceService.ensureDirectories(repository.id);
    const duration = Date.now() - startTime;
    this.logger.debug(`Prepared workspace for repository ${repository.id} (${duration}ms)`);
  }

  async cloneRepository(repository: GitRepository): Promise<void> {
    const releaseLock = await this.lockService.acquireLock(repository.id);
    try {
      const startTime = Date.now();
      const exists = await this.repositoryExists(repository.id);
      if (exists) {
        throw new RepositoryAlreadyClonedException(repository.id);
      }

      await this.prepareWorkspace(repository);
      const workspacePath = this.workspaceService.getWorkspacePath(repository.id);

      try {
        await this.gitService.clone(repository.cloneUrl, workspacePath);
        const duration = Date.now() - startTime;
        this.logger.log(`Successfully cloned repository ${repository.id} (${duration}ms)`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new CloneFailedException(repository.id, message, error);
      }
    } finally {
      releaseLock();
    }
  }

  async pullRepository(repository: GitRepository): Promise<void> {
    const releaseLock = await this.lockService.acquireLock(repository.id);
    try {
      const startTime = Date.now();
      const exists = await this.repositoryExists(repository.id);
      if (!exists) {
        throw new RepositoryNotFoundException(repository.id);
      }

      const workspacePath = this.workspaceService.getWorkspacePath(repository.id);

      try {
        await this.gitService.fetch(workspacePath);
        await this.gitService.pull(workspacePath);
        const duration = Date.now() - startTime;
        this.logger.log(`Successfully pulled repository ${repository.id} (${duration}ms)`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new PullFailedException(repository.id, message, error);
      }
    } finally {
      releaseLock();
    }
  }

  async checkoutBranch(repository: GitRepository, branch?: string): Promise<void> {
    const releaseLock = await this.lockService.acquireLock(repository.id);
    try {
      const startTime = Date.now();
      const exists = await this.repositoryExists(repository.id);
      if (!exists) {
        throw new RepositoryNotFoundException(repository.id);
      }

      const ref = branch || repository.defaultBranch;
      const workspacePath = this.workspaceService.getWorkspacePath(repository.id);

      try {
        await this.gitService.checkout(workspacePath, ref);
        const duration = Date.now() - startTime;
        this.logger.log(`Successfully checked out ${ref} for repository ${repository.id} (${duration}ms)`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new CheckoutFailedException(repository.id, ref, message, error);
      }
    } finally {
      releaseLock();
    }
  }

  async resetHard(repository: GitRepository, ref?: string): Promise<void> {
    const releaseLock = await this.lockService.acquireLock(repository.id);
    try {
      const startTime = Date.now();
      const exists = await this.repositoryExists(repository.id);
      if (!exists) {
        throw new RepositoryNotFoundException(repository.id);
      }

      const workspacePath = this.workspaceService.getWorkspacePath(repository.id);

      await this.gitService.resetHard(workspacePath, ref);
      const duration = Date.now() - startTime;
      this.logger.log(`Successfully reset hard repository ${repository.id} (${duration}ms)`);
    } finally {
      releaseLock();
    }
  }

  async clean(repository: GitRepository): Promise<void> {
    const releaseLock = await this.lockService.acquireLock(repository.id);
    try {
      const startTime = Date.now();
      const exists = await this.repositoryExists(repository.id);
      if (!exists) {
        throw new RepositoryNotFoundException(repository.id);
      }

      const workspacePath = this.workspaceService.getWorkspacePath(repository.id);

      await this.gitService.clean(workspacePath);
      const duration = Date.now() - startTime;
      this.logger.log(`Successfully cleaned repository ${repository.id} (${duration}ms)`);
    } finally {
      releaseLock();
    }
  }

  async deleteClone(repository: GitRepository): Promise<void> {
    const releaseLock = await this.lockService.acquireLock(repository.id);
    try {
      await this.workspaceService.removeRepository(repository.id);
    } finally {
      releaseLock();
    }
  }

  async getCurrentBranch(repository: GitRepository): Promise<string> {
    const exists = await this.repositoryExists(repository.id);
    if (!exists) {
      throw new RepositoryNotFoundException(repository.id);
    }

    const workspacePath = this.workspaceService.getWorkspacePath(repository.id);
    return this.gitService.currentBranch(workspacePath);
  }

  async repositoryStatus(repository: GitRepository): Promise<ReturnType<GitService['status']>> {
    const exists = await this.repositoryExists(repository.id);
    if (!exists) {
      throw new RepositoryNotFoundException(repository.id);
    }

    const workspacePath = this.workspaceService.getWorkspacePath(repository.id);
    return this.gitService.status(workspacePath);
  }

  async repositoryExists(repositoryId: string): Promise<boolean> {
    return this.workspaceService.repositoryExists(repositoryId);
  }

  getRepositoryPath(repository: GitRepository): string {
    return this.workspaceService.getRepositoryPath(repository.id);
  }

  getClonePath(repository: GitRepository): string {
    return this.workspaceService.getClonePath(repository.id);
  }

  getWorkspacePath(repository: GitRepository): string {
    return this.workspaceService.getWorkspacePath(repository.id);
  }

  getArtifactsPath(repository: GitRepository): string {
    return this.workspaceService.getArtifactsPath(repository.id);
  }

  async cleanupWorkspace(repository: GitRepository): Promise<void> {
    const releaseLock = await this.lockService.acquireLock(repository.id);
    try {
      const startTime = Date.now();
      await this.workspaceService.cleanupWorkspace(repository.id);
      const duration = Date.now() - startTime;
      this.logger.log(`Cleaned up workspace for repository ${repository.id} (${duration}ms)`);
    } finally {
      releaseLock();
    }
  }

  async removeRepository(repository: GitRepository): Promise<void> {
    await this.deleteClone(repository);
  }
}
