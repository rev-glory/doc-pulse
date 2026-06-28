import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { GitService } from './git.service';
import * as path from 'path';
import { GitHubAuthService } from '@/modules/github/services/github-auth.service';
import { isGitException } from '../errors/git-exception';

export interface CommitResult {
  branchName: string;
  commitSha: string;
  durationMs: number;
  emptyCommit: boolean;
}

@Injectable()
export class GitOperationsService {
  private readonly logger = new Logger(GitOperationsService.name);

  constructor(
    private readonly gitService: GitService,
    @Optional() @Inject(forwardRef(() => GitHubAuthService))
    private readonly githubAuthService?: GitHubAuthService,
  ) {}

  /**
   * Generates a sanitized, unique branch name for the documentation update.
   */
  async generateBranchName(repositoryPath: string, runId: string): Promise<string> {
    const cleanId = runId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40);
    const baseBranchName = `docpulse/docs-update/${cleanId}`;

    const existingBranches = await this.gitService.branchList(repositoryPath);
    if (!existingBranches.includes(baseBranchName)) {
      return baseBranchName;
    }

    // Handle collision
    const collisionName = `${baseBranchName}-${Date.now().toString().slice(-6)}`;
    this.logger.warn(`Branch collision detected for [${baseBranchName}]. Using fallback [${collisionName}]`);
    return collisionName;
  }

  private async logGitDiagnostics(repositoryPath: string, branchName: string): Promise<void> {
    try {
      const cwd = process.cwd();
      let gitRoot = 'unknown';
      try {
        gitRoot = await this.gitService.getRepositoryRoot(repositoryPath);
      } catch (e) {
        gitRoot = `Error: ${(e as Error).message}`;
      }

      let owner = 'unknown';
      let repo = 'unknown';
      try {
        const remoteUrl = await this.gitService.getRemoteUrl(repositoryPath, 'origin');
        if (remoteUrl) {
          const match = remoteUrl.trim().match(/github\.com[/:]([^/]+)\/([^.]+)/);
          if (match) {
            owner = match[1]!;
            repo = match[2]!;
          }
        }
      } catch (e) {
        // remote url may not be set or git error
      }

      this.logger.log(`
================ GIT DIAGNOSTICS ================
Repository workspace: ${repositoryPath}
Repository owner:     ${owner}
Repository name:      ${repo}
Branch:               ${branchName}
Current cwd:          ${cwd}
Git root:             ${gitRoot}
=================================================
      `);
    } catch (err) {
      this.logger.error(`Failed to print Git diagnostics: ${(err as Error).message}`);
    }
  }

  /**
   * Orchestrates safe staging and committing of generated documentation files.
   */
  async commitChanges(
    repositoryPath: string,
    runId: string,
    filesToStage: string[],
    existingBranchName?: string,
  ): Promise<CommitResult> {
    const startTime = Date.now();
    this.logger.debug(`Orchestrating Git commit for run [${runId}] in [${repositoryPath}]...`);
    let branchName = existingBranchName;

    try {
      // 1. Generate branch & create/checkout
      if (!branchName) {
        branchName = await this.generateBranchName(repositoryPath, runId);
      }
      await this.logGitDiagnostics(repositoryPath, branchName);

      const localBranches = await this.gitService.branchList(repositoryPath);
      if (localBranches.includes(branchName)) {
        this.logger.log(`Branch [${branchName}] already exists. Checking out...`);
        await this.gitService.checkout(repositoryPath, branchName);
      } else {
        this.logger.log(`Branch [${branchName}] does not exist. Creating and checking out local branch...`);
        await this.gitService.checkoutLocalBranch(repositoryPath, branchName);
      }

      // Run Git safety checks on branch and workspace
      await this.runGitSafetyChecks(repositoryPath, branchName);

      // 2. Validate dirty tree & detect changes
      const statusBefore = await this.gitService.status(repositoryPath);
      const isDirty = statusBefore.modified.length > 0 || statusBefore.not_added.length > 0 || statusBefore.created.length > 0;

      if (!isDirty && filesToStage.length === 0) {
        this.logger.log(`No working tree changes detected for run [${runId}]. Skipping commit.`);
        const currentSha = await this.gitService.currentCommit(repositoryPath);
        return {
          branchName,
          commitSha: currentSha,
          durationMs: Date.now() - startTime,
          emptyCommit: true,
        };
      }

      // 3. Stage files
      const targets = filesToStage.length > 0 ? filesToStage : '.';
      await this.gitService.add(repositoryPath, targets);

      // 4. Verify status after staging
      const statusAfter = await this.gitService.status(repositoryPath);
      if (statusAfter.staged.length === 0 && statusAfter.created.length === 0) {
        this.logger.log(`Staging produced empty diff for run [${runId}].`);
        const currentSha = await this.gitService.currentCommit(repositoryPath);
        return {
          branchName,
          commitSha: currentSha,
          durationMs: Date.now() - startTime,
          emptyCommit: true,
        };
      }

      // 5. Commit changes
      const commitMessage = `docs(docpulse): update automated documentation [${runId}]`;
      const commitSha = await this.gitService.commit(repositoryPath, commitMessage);
      const finalSha = commitSha || (await this.gitService.currentCommit(repositoryPath));

      const durationMs = Date.now() - startTime;
      this.logger.log({
        event: 'git_commit_success',
        runId,
        branchName,
        commitSha: finalSha,
        durationMs,
      });

      return {
        branchName,
        commitSha: finalSha,
        durationMs,
        emptyCommit: false,
      };
    } catch (error) {
      const isGit = isGitException(error);
      const codeStr = isGit ? error.code : 'UNKNOWN';
      const retryableFlag = isGit ? error.retryable : false;
      const providerName = isGit ? error.provider.provider : 'UnknownProvider';
      const opName = isGit ? error.operation : 'commitChanges';

      this.logger.error(
        `Git commit flow failed for run [${runId}]. Initiating rollback... ` +
        `Provider: ${providerName}, Operation: ${opName}, Code: ${codeStr}, Retryable: ${retryableFlag}. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      await this.rollback(repositoryPath, branchName);
      throw error;
    }
  }

  /**
   * Pushes the local branch to the remote origin.
   */
  async pushBranch(repositoryPath: string, branchName: string, installationId?: number): Promise<void> {
    const startTime = Date.now();
    await this.logGitDiagnostics(repositoryPath, branchName);
    this.logger.debug(`Pushing branch [${branchName}] to remote origin...`);

    // 1. Get current origin remote URL
    let originalRemoteUrl: string | undefined;
    try {
      originalRemoteUrl = await this.gitService.getRemoteUrl(repositoryPath, 'origin');
      if (originalRemoteUrl) {
        originalRemoteUrl = originalRemoteUrl.trim();
      }
    } catch (err) {
      this.logger.error(`Failed to get original remote URL for [${repositoryPath}]: ${(err as Error).message}`);
      throw new Error(`Push failed: Could not determine original origin remote URL.`);
    }

    if (!originalRemoteUrl) {
      throw new Error(`Push failed: Original origin remote URL is empty.`);
    }

    // Extract owner and repo from original remote URL
    const match = originalRemoteUrl.match(/github\.com[/:]([^/]+)\/([^.]+)/);
    if (!match) {
      throw new Error(`Push failed: Could not parse owner/repo from remote URL [${originalRemoteUrl}].`);
    }
    const owner = match[1]!;
    const repo = match[2]!.replace(/\.git$/, '');

    // If we couldn't get it, warn the user
    if (!installationId) {
      this.logger.warn(`No GitHub App installation ID provided for pushing to [${owner}/${repo}]. Fallback authentication might fail.`);
    }

    // 2. Get Installation Access Token
    let token = '';
    if (installationId && this.githubAuthService) {
      try {
        token = await this.githubAuthService.getInstallationAccessToken(installationId);
      } catch (authErr) {
        this.logger.error(`Failed to get installation access token for installation [${installationId}]: ${(authErr as Error).message}`);
        throw authErr;
      }
    } else {
      this.logger.warn(`Bypassing GitHub token authentication lookup because installationId or githubAuthService is not provided.`);
    }

    // 3. Construct authenticated URL & execute push
    const authenticatedUrl = token
      ? `https://x-access-token:${token}@github.com/${owner}/${repo}.git`
      : null;

    try {
      // Run Git safety checks on branch and workspace before push
      await this.runGitSafetyChecks(repositoryPath, branchName);

      if (authenticatedUrl) {
        this.logger.debug(`Temporarily setting origin URL to authenticated URL.`);
        await this.gitService.setRemoteUrl(repositoryPath, 'origin', authenticatedUrl);
      }

      await this.gitService.push(repositoryPath, 'origin', branchName, ['-u']);
      const durationMs = Date.now() - startTime;
      this.logger.log({
        event: 'git_push_success',
        branchName,
        durationMs,
      });
    } catch (error) {
      const isGit = isGitException(error);
      const codeStr = isGit ? error.code : 'UNKNOWN';
      const retryableFlag = isGit ? error.retryable : false;
      const providerName = isGit ? error.provider.provider : 'UnknownProvider';
      const opName = isGit ? error.operation : 'pushBranch';

      this.logger.error(
        `Push rejected for branch [${branchName}]. Initiating rollback... ` +
        `Provider: ${providerName}, Operation: ${opName}, Code: ${codeStr}, Retryable: ${retryableFlag}. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      await this.rollback(repositoryPath, branchName);
      throw error;
    } finally {
      if (authenticatedUrl) {
        // Restore the original remote URL
        try {
          this.logger.debug(`Restoring original origin URL.`);
          await this.gitService.setRemoteUrl(repositoryPath, 'origin', originalRemoteUrl);
        } catch (restoreErr) {
          this.logger.error(`Failed to restore original remote URL for [${repositoryPath}]: ${(restoreErr as Error).message}`);
        }
      }
    }
  }

  /**
   * Executes recovery rollback resetting working tree hard to original HEAD and cleaning untracked files.
   * If branchName is specified, switches away from it and deletes it.
   */
  async rollback(repositoryPath: string, branchName?: string): Promise<void> {
    this.logger.warn(`Executing Git rollback strategy for [${repositoryPath}]...`);
    try {
      if (branchName) {
        try {
          const current = await this.gitService.currentBranch(repositoryPath);
          if (current === branchName) {
            const localBranches = await this.gitService.branchList(repositoryPath);
            const commonBaselines = ['main', 'master', 'develop', 'trunk', 'release'];
            let safeBranch: string | undefined;

            for (const base of commonBaselines) {
              if (localBranches.includes(base)) {
                safeBranch = base;
                break;
              }
            }

            if (!safeBranch && localBranches.length > 0) {
              safeBranch = localBranches.find(b => b !== branchName);
            }

            if (!safeBranch) {
              safeBranch = 'main';
            }

            this.logger.log(`Switching away from temporary branch [${branchName}] to safe branch [${safeBranch}] before deletion.`);
            await this.gitService.checkout(repositoryPath, safeBranch);
          }
        } catch (checkoutErr) {
          this.logger.error(`Failed to switch branches during rollback: ${(checkoutErr as Error).message}`);
        }
      }

      await this.gitService.resetHard(repositoryPath);
      await this.gitService.clean(repositoryPath);

      if (branchName) {
        try {
          const localBranches = await this.gitService.branchList(repositoryPath);
          if (localBranches.includes(branchName)) {
            this.logger.log(`Deleting local temporary branch [${branchName}]...`);
            await this.gitService.deleteLocalBranch(repositoryPath, branchName, true);
          }
        } catch (deleteErr) {
          this.logger.error(`Failed to delete branch [${branchName}] during rollback: ${(deleteErr as Error).message}`);
        }
      }

      this.logger.log(`Rollback complete. Repository restored to clean baseline.`);
    } catch (err) {
      this.logger.error(`Rollback failed for [${repositoryPath}]: ${(err as Error).message}`);
    }
  }

  /**
   * Runs local safety and security checks on a branch and the current repository state before writing/pushing.
   */
  async runGitSafetyChecks(repositoryPath: string, branchName: string): Promise<void> {
    this.logger.debug(`Running Git safety checks in [${repositoryPath}] for branch [${branchName}]...`);

    // 1. Protected Branch Detection
    const protectedBranches = ['main', 'master', 'production', 'release'];
    if (protectedBranches.includes(branchName)) {
      throw new Error(`Git safety violation: Cannot commit or push directly to protected branch [${branchName}].`);
    }

    const status = await this.gitService.status(repositoryPath);

    // 2. Merge Conflict Detection
    if (status.conflicted && status.conflicted.length > 0) {
      throw new Error(`Git safety violation: Merge conflicts detected in workspace: ${status.conflicted.join(', ')}.`);
    }

    // 3. Sensitive File Detection
    const sensitivePatterns = [
      /\.env.*/i,
      /id_rsa/i,
      /id_dsa/i,
      /\.pem$/i,
      /\.key$/i,
      /passwd/i,
      /shadow/i,
      /credentials/i,
      /secret/i
    ];

    const allChangedFiles = [
      ...status.modified,
      ...status.created,
      ...status.not_added,
      ...status.staged,
    ];

    for (const file of allChangedFiles) {
      const filename = path.basename(file);
      if (sensitivePatterns.some(pattern => pattern.test(filename))) {
        throw new Error(`Git safety violation: Sensitive file detected in changes: [${file}]. Committing/pushing is aborted.`);
      }
    }

    this.logger.log(`All Git safety checks passed successfully for branch [${branchName}].`);
  }
}
