import { Injectable, Logger } from '@nestjs/common';
import { GitService } from './git.service';
import * as path from 'path';

export interface CommitResult {
  branchName: string;
  commitSha: string;
  durationMs: number;
  emptyCommit: boolean;
}

@Injectable()
export class GitOperationsService {
  private readonly logger = new Logger(GitOperationsService.name);

  constructor(private readonly gitService: GitService) {}

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

  /**
   * Orchestrates safe staging and committing of generated documentation files.
   */
  async commitChanges(
    repositoryPath: string,
    runId: string,
    filesToStage: string[],
  ): Promise<CommitResult> {
    const startTime = Date.now();
    this.logger.debug(`Orchestrating Git commit for run [${runId}] in [${repositoryPath}]...`);

    try {
      // 1. Generate branch & create/checkout
      const branchName = await this.generateBranchName(repositoryPath, runId);
      await this.gitService.checkoutLocalBranch(repositoryPath, branchName);

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
      this.logger.error(`Git commit flow failed for run [${runId}]. Initiating rollback...`, (error as Error).stack);
      await this.rollback(repositoryPath);
      throw error;
    }
  }

  /**
   * Pushes the local branch to the remote origin.
   */
  async pushBranch(repositoryPath: string, branchName: string): Promise<void> {
    const startTime = Date.now();
    this.logger.debug(`Pushing branch [${branchName}] to remote origin...`);
    try {
      // Run Git safety checks on branch and workspace before push
      await this.runGitSafetyChecks(repositoryPath, branchName);

      await this.gitService.push(repositoryPath, 'origin', branchName, ['-u']);
      const durationMs = Date.now() - startTime;
      this.logger.log({
        event: 'git_push_success',
        branchName,
        durationMs,
      });
    } catch (error) {
      this.logger.error(`Push rejected for branch [${branchName}]. Initiating rollback...`, (error as Error).stack);
      await this.rollback(repositoryPath);
      throw error;
    }
  }

  /**
   * Executes recovery rollback resetting working tree hard to original HEAD and cleaning untracked files.
   */
  async rollback(repositoryPath: string): Promise<void> {
    this.logger.warn(`Executing Git rollback strategy for [${repositoryPath}]...`);
    try {
      await this.gitService.resetHard(repositoryPath);
      await this.gitService.clean(repositoryPath);
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
