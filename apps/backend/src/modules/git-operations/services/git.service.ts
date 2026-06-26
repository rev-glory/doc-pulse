import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';
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

  protected createGitClient(baseDir: string): SimpleGit {
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

  async resetHard(repositoryPath: string, ref?: string): Promise<void> {
    const startTime = Date.now();
    this.logger.debug(`Resetting repository at ${repositoryPath} hard to ${ref || 'HEAD'}`);
    const git = this.createGitClient(repositoryPath);
    await git.reset(['--hard', ref || 'HEAD']);
    const duration = Date.now() - startTime;
    this.logger.log(`Reset repository at ${repositoryPath} hard (${duration}ms)`);
  }

  async clean(repositoryPath: string): Promise<void> {
    const startTime = Date.now();
    this.logger.debug(`Cleaning untracked files in repository at ${repositoryPath}`);
    const git = this.createGitClient(repositoryPath);
    await git.clean('f', ['-d']);
    const duration = Date.now() - startTime;
    this.logger.log(`Cleaned untracked files in repository at ${repositoryPath} (${duration}ms)`);
  }

  async status(repositoryPath: string): Promise<ReturnType<SimpleGit['status']>> {
    const git = this.createGitClient(repositoryPath);
    return git.status();
  }

  async branchList(repositoryPath: string): Promise<string[]> {
    const git = this.createGitClient(repositoryPath);
    const summary = await git.branchLocal();
    return summary.all;
  }

  async branchLocal(repositoryPath: string, branchName: string): Promise<void> {
    const git = this.createGitClient(repositoryPath);
    await git.branch([branchName]);
  }

  async checkoutLocalBranch(repositoryPath: string, branchName: string): Promise<void> {
    const git = this.createGitClient(repositoryPath);
    await git.checkoutLocalBranch(branchName);
  }

  async deleteLocalBranch(repositoryPath: string, branchName: string, force = false): Promise<void> {
    const git = this.createGitClient(repositoryPath);
    await git.deleteLocalBranch(branchName, force);
  }

  async add(repositoryPath: string, files: string | string[]): Promise<void> {
    const git = this.createGitClient(repositoryPath);
    await git.add(files);
  }

  async commit(repositoryPath: string, message: string): Promise<string> {
    const git = this.createGitClient(repositoryPath);
    const result = await git.commit(message);
    return result.commit || '';
  }

  async push(repositoryPath: string, remote: string, branch: string, options: string[] = []): Promise<void> {
    const git = this.createGitClient(repositoryPath);
    await git.push(remote, branch, options);
  }

  async diff(repositoryPath: string, options: string[] = []): Promise<string> {
    const git = this.createGitClient(repositoryPath);
    return git.diff(options);
  }

  async delete(repositoryPath: string): Promise<void> {
    this.logger.debug(`Deleting repository at ${repositoryPath}`);
    await fs.rm(repositoryPath, { recursive: true, force: true });
    this.logger.log(`Deleted repository at ${repositoryPath}`);
  }
}
