import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';

import type { StorageConfig } from '@/config';
import { IGitProvider } from '../../interfaces/git-provider.interface';
import { GitStatus } from '../../types/git-types';
import { SimpleGitErrorMapper } from '../../errors/simple-git-error-mapper';
import { GitException } from '../../errors/git-exception';

@Injectable()
export class SimpleGitProvider implements IGitProvider {
  private readonly logger = new Logger(SimpleGitProvider.name);
  private readonly mapper = new SimpleGitErrorMapper();
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

  private wrapError(operation: string, error: unknown, repository?: string, branch?: string): GitException {
    return this.mapper.mapError({ operation, error, repository, branch });
  }

  async clone(repositoryUrl: string, destinationPath: string): Promise<void> {
    try {
      const git = this.createGitClient(path.dirname(destinationPath));
      await git.clone(repositoryUrl, path.basename(destinationPath));
    } catch (error) {
      throw this.wrapError('clone', error, repositoryUrl);
    }
  }

  async fetch(repositoryPath: string): Promise<void> {
    try {
      const git = this.createGitClient(repositoryPath);
      await git.fetch();
    } catch (error) {
      throw this.wrapError('fetch', error, repositoryPath);
    }
  }

  async pull(repositoryPath: string): Promise<void> {
    try {
      const git = this.createGitClient(repositoryPath);
      await git.pull();
    } catch (error) {
      throw this.wrapError('pull', error, repositoryPath);
    }
  }

  async checkout(repositoryPath: string, ref: string): Promise<void> {
    try {
      const git = this.createGitClient(repositoryPath);
      await git.checkout(ref);
    } catch (error) {
      throw this.wrapError('checkout', error, repositoryPath, ref);
    }
  }

  async currentBranch(repositoryPath: string): Promise<string> {
    try {
      const git = this.createGitClient(repositoryPath);
      const branch = await git.branch();
      return branch.current;
    } catch (error) {
      throw this.wrapError('currentBranch', error, repositoryPath);
    }
  }

  async currentCommit(repositoryPath: string): Promise<string> {
    try {
      const git = this.createGitClient(repositoryPath);
      const res = await git.revparse('HEAD');
      return typeof res === 'string' ? res.trim() : '';
    } catch (error) {
      throw this.wrapError('currentCommit', error, repositoryPath);
    }
  }

  async resetHard(repositoryPath: string, ref?: string): Promise<void> {
    try {
      const git = this.createGitClient(repositoryPath);
      await git.reset(['--hard', ref || 'HEAD']);
    } catch (error) {
      throw this.wrapError('resetHard', error, repositoryPath, ref);
    }
  }

  async clean(repositoryPath: string): Promise<void> {
    try {
      const git = this.createGitClient(repositoryPath);
      await git.clean('f', ['-d']);
    } catch (error) {
      throw this.wrapError('clean', error, repositoryPath);
    }
  }

  async status(repositoryPath: string): Promise<GitStatus> {
    try {
      const git = this.createGitClient(repositoryPath);
      const res = await git.status();
      return {
        conflicted: res.conflicted || [],
        modified: res.modified || [],
        created: res.created || [],
        not_added: res.not_added || [],
        staged: res.staged || [],
        isDirty:
          (res.modified || []).length > 0 ||
          (res.not_added || []).length > 0 ||
          (res.created || []).length > 0,
      };
    } catch (error) {
      throw this.wrapError('status', error, repositoryPath);
    }
  }

  async branchList(repositoryPath: string): Promise<string[]> {
    try {
      const git = this.createGitClient(repositoryPath);
      const summary = await git.branchLocal();
      return summary.all;
    } catch (error) {
      throw this.wrapError('branchList', error, repositoryPath);
    }
  }

  async checkoutLocalBranch(repositoryPath: string, branchName: string): Promise<void> {
    try {
      const git = this.createGitClient(repositoryPath);
      await git.checkoutLocalBranch(branchName);
    } catch (error) {
      throw this.wrapError('checkoutLocalBranch', error, repositoryPath, branchName);
    }
  }

  async deleteLocalBranch(repositoryPath: string, branchName: string, force = false): Promise<void> {
    try {
      const git = this.createGitClient(repositoryPath);
      await git.deleteLocalBranch(branchName, force);
    } catch (error) {
      throw this.wrapError('deleteLocalBranch', error, repositoryPath, branchName);
    }
  }

  async add(repositoryPath: string, files: string | string[]): Promise<void> {
    try {
      const git = this.createGitClient(repositoryPath);
      await git.add(files);
    } catch (error) {
      throw this.wrapError('add', error, repositoryPath);
    }
  }

  async commit(repositoryPath: string, message: string): Promise<string> {
    try {
      const git = this.createGitClient(repositoryPath);
      const result = await git.commit(message);
      return result.commit || '';
    } catch (error) {
      throw this.wrapError('commit', error, repositoryPath);
    }
  }

  async push(repositoryPath: string, remote: string, branch: string, options: string[] = []): Promise<void> {
    try {
      const git = this.createGitClient(repositoryPath);
      await git.push(remote, branch, options);
    } catch (error) {
      throw this.wrapError('push', error, repositoryPath, branch);
    }
  }

  async diff(repositoryPath: string, options: string[] = []): Promise<string> {
    try {
      const git = this.createGitClient(repositoryPath);
      return await git.diff(options);
    } catch (error) {
      throw this.wrapError('diff', error, repositoryPath);
    }
  }

  async getRepositoryRoot(repositoryPath: string): Promise<string> {
    try {
      const git = this.createGitClient(repositoryPath);
      const root = await git.revparse(['--show-toplevel']);
      return typeof root === 'string' ? root.trim() : '';
    } catch (error) {
      throw this.wrapError('getRepositoryRoot', error, repositoryPath);
    }
  }

  async getRemoteUrl(repositoryPath: string, remoteName: string): Promise<string> {
    try {
      const git = this.createGitClient(repositoryPath);
      const res = await git.remote(['get-url', remoteName]);
      return typeof res === 'string' ? res.trim() : '';
    } catch (error) {
      throw this.wrapError('getRemoteUrl', error, repositoryPath);
    }
  }

  async setRemoteUrl(repositoryPath: string, remoteName: string, url: string): Promise<void> {
    try {
      const git = this.createGitClient(repositoryPath);
      await git.remote(['set-url', remoteName, url]);
    } catch (error) {
      throw this.wrapError('setRemoteUrl', error, repositoryPath);
    }
  }
}
