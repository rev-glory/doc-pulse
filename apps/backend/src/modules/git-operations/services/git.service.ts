import { Inject, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';

import { GIT_PROVIDER, IGitProvider } from '../interfaces/git-provider.interface';
import { GitStatus } from '../types/git-types';

@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);

  constructor(
    @Inject(GIT_PROVIDER)
    private readonly provider: IGitProvider,
  ) {}

  async clone(repositoryUrl: string, destinationPath: string): Promise<void> {
    await this.provider.clone(repositoryUrl, destinationPath);
  }

  async fetch(repositoryPath: string): Promise<void> {
    await this.provider.fetch(repositoryPath);
  }

  async pull(repositoryPath: string): Promise<void> {
    await this.provider.pull(repositoryPath);
  }

  async checkout(repositoryPath: string, ref: string): Promise<void> {
    await this.provider.checkout(repositoryPath, ref);
  }

  async currentBranch(repositoryPath: string): Promise<string> {
    return this.provider.currentBranch(repositoryPath);
  }

  async currentCommit(repositoryPath: string): Promise<string> {
    return this.provider.currentCommit(repositoryPath);
  }

  async resetHard(repositoryPath: string, ref?: string): Promise<void> {
    await this.provider.resetHard(repositoryPath, ref);
  }

  async clean(repositoryPath: string): Promise<void> {
    await this.provider.clean(repositoryPath);
  }

  async status(repositoryPath: string): Promise<GitStatus> {
    return this.provider.status(repositoryPath);
  }

  async branchList(repositoryPath: string): Promise<string[]> {
    return this.provider.branchList(repositoryPath);
  }

  async checkoutLocalBranch(repositoryPath: string, branchName: string): Promise<void> {
    await this.provider.checkoutLocalBranch(repositoryPath, branchName);
  }

  async deleteLocalBranch(repositoryPath: string, branchName: string, force = false): Promise<void> {
    await this.provider.deleteLocalBranch(repositoryPath, branchName, force);
  }

  async add(repositoryPath: string, files: string | string[]): Promise<void> {
    await this.provider.add(repositoryPath, files);
  }

  async commit(repositoryPath: string, message: string): Promise<string> {
    return this.provider.commit(repositoryPath, message);
  }

  async push(repositoryPath: string, remote: string, branch: string, options: string[] = []): Promise<void> {
    await this.provider.push(repositoryPath, remote, branch, options);
  }

  async diff(repositoryPath: string, options: string[] = []): Promise<string> {
    return this.provider.diff(repositoryPath, options);
  }

  async getRepositoryRoot(repositoryPath: string): Promise<string> {
    return this.provider.getRepositoryRoot(repositoryPath);
  }

  async getRemoteUrl(repositoryPath: string, remoteName: string): Promise<string> {
    return this.provider.getRemoteUrl(repositoryPath, remoteName);
  }

  async setRemoteUrl(repositoryPath: string, remoteName: string, url: string): Promise<void> {
    await this.provider.setRemoteUrl(repositoryPath, remoteName, url);
  }

  async delete(repositoryPath: string): Promise<void> {
    this.logger.debug(`Deleting repository at ${repositoryPath}`);
    await fs.rm(repositoryPath, { recursive: true, force: true });
    this.logger.log(`Deleted repository at ${repositoryPath}`);
  }
}
