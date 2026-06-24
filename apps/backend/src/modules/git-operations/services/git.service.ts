import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';

import type { StorageConfig } from '@/config';

@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);
  private readonly gitTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    const storageConfig = this.configService.getOrThrow<StorageConfig>('storage');
    this.gitTimeoutMs = storageConfig.gitTimeoutMs;
  }

  private createGitClient(baseDir: string): SimpleGit {
    const options: Partial<SimpleGitOptions> = {
      baseDir,
      binary: 'git',
      maxConcurrentProcesses: 6,
      timeout: {
        block: this.gitTimeoutMs,
      },
    };
    return simpleGit(options);
  }

  async clone(repositoryUrl: string, destinationPath: string): Promise<void> {
    const startTime = Date.now();
    this.logger.debug(`Cloning repository from ${repositoryUrl} to ${destinationPath}`);
    const git = this.createGitClient(path.dirname(destinationPath));
    await git.clone(repositoryUrl, path.basename(destinationPath));
    const duration = Date.now() - startTime;
    this.logger.log(`Successfully cloned repository to ${destinationPath} (${duration}ms)`);
  }

  async fetch(repositoryPath: string): Promise<void> {
    const startTime = Date.now();
    this.logger.debug(`Fetching updates for repository at ${repositoryPath}`);
    const git = this.createGitClient(repositoryPath);
    await git.fetch();
    const duration = Date.now() - startTime;
    this.logger.debug(`Fetched updates for repository at ${repositoryPath} (${duration}ms)`);
  }

  async pull(repositoryPath: string): Promise<void> {
    const startTime = Date.now();
    this.logger.debug(`Pulling latest changes for repository at ${repositoryPath}`);
    const git = this.createGitClient(repositoryPath);
    await git.pull();
    const duration = Date.now() - startTime;
    this.logger.log(`Pulled latest changes for repository at ${repositoryPath} (${duration}ms)`);
  }

  async checkout(repositoryPath: string, ref: string): Promise<void> {
    const startTime = Date.now();
    this.logger.debug(`Checking out ${ref} for repository at ${repositoryPath}`);
    const git = this.createGitClient(repositoryPath);
    await git.checkout(ref);
    const duration = Date.now() - startTime;
    this.logger.log(`Checked out ${ref} for repository at ${repositoryPath} (${duration}ms)`);
  }

  async currentBranch(repositoryPath: string): Promise<string> {
    const git = this.createGitClient(repositoryPath);
    const branch = await git.branch();
    return branch.current;
  }

  async currentCommit(repositoryPath: string): Promise<string> {
    const git = this.createGitClient(repositoryPath);
    return git.revparse('HEAD');
  }
}
