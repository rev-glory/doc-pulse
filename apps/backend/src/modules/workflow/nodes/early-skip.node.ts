import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database';
import { GitService } from '../../git-operations/services/git.service';
import { RepositoryCloneService } from '../../git-operations/services/repository-clone.service';
import { WorkspaceLifecycleService } from '../../git-operations/services/workspace-lifecycle.service';
import { WorkflowGraphState } from '../graph/graph.types';
import { SKIP_RULES, SkipRule } from './early-skip-rules';

@Injectable()
export class EarlySkipNode {
  private readonly logger = new Logger(EarlySkipNode.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gitService: GitService,
    private readonly repositoryCloneService: RepositoryCloneService,
    private readonly workspaceLifecycleService: WorkspaceLifecycleService,
    @Inject(SKIP_RULES) private readonly rules: SkipRule[],
  ) {}

  public async invoke(state: WorkflowGraphState): Promise<Partial<WorkflowGraphState>> {
    const repositoryId = state.repositoryId;
    if (!repositoryId) {
      return {};
    }

    const repoRecord = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
      include: { installation: true },
    });
    if (!repoRecord) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    // Step 1: Ensure workspace exists and is cloned
    const exists = await this.workspaceLifecycleService.workspaceExists(repositoryId);
    if (!exists) {
      await this.repositoryCloneService.cloneRepository({
        id: repoRecord.id,
        cloneUrl: repoRecord.cloneUrl,
        defaultBranch: repoRecord.defaultBranch,
      });
    }

    const workspacePath = this.workspaceLifecycleService.getWorkspacePath(repositoryId);

    // Step 2: Determine commit Sha and fetch commit metadata (modified files, commit message)
    const commitSha = state.commitSha && state.commitSha !== 'unknown' ? state.commitSha : 'HEAD';
    let modifiedFiles: string[] = [];
    let commitMessage = '';

    try {
      modifiedFiles = await this.gitService.getModifiedFiles(workspacePath, commitSha);
      commitMessage = await this.gitService.getCommitMessage(workspacePath, commitSha);
    } catch (err: any) {
      this.logger.warn(`Failed to retrieve git info for skip analysis: ${err.message}. Defaulting to empty.`);
    }

    // Step 3: Run rules engine
    const context = {
      isRepositoryActive: repoRecord.isActive,
      modifiedFiles,
      commitMessage,
      state,
    };

    for (const rule of this.rules) {
      const decision = await rule.evaluate(context);
      if (decision.shouldSkip) {
        this.logger.log(`Early skip triggered by ${rule.constructor.name}: ${decision.reason}`);
        return {
          workspacePath,
          changedFiles: modifiedFiles,
          commitMessage,
          shouldSkip: true,
          skipReason: decision.reason,
        };
      }
    }

    return {
      workspacePath,
      changedFiles: modifiedFiles,
      commitMessage,
      shouldSkip: false,
      skipReason: undefined,
    };
  }
}
