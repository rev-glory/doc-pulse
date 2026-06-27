import { Injectable, Logger, Optional } from '@nestjs/common';
import { GitOperationsService } from '../../git-operations/services/git-operations.service';
import { GitOperationStatus } from '../../../domain/workflow';
import { PrismaService } from '@/database';
import type { WorkflowGraphState } from '../graph/graph.types';

@Injectable()
export class PushBranchNode {
  private readonly logger = new Logger(PushBranchNode.name);

  constructor(
    private readonly gitOpsService: GitOperationsService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async invoke(state: WorkflowGraphState): Promise<Partial<WorkflowGraphState>> {
    const runId = state.runId || 'automated';
    const repoPath = state.workspacePath || state.repository?.rootPath || '';
    const branchName = state.branchName || '';

    this.logger.debug(`Executing PushBranchNode for run [${runId}] pushing [${branchName}]...`);

    if (!repoPath || !branchName) {
      throw new Error(`PushBranchNode error: Missing workspacePath or branchName in workflow state.`);
    }

    // Extract installation metadata (fallback to 0 or metadata)
    let installationId = Number(state.metadata?.installationId || 0);

    if (!installationId && this.prisma && this.prisma.repository) {
      const dbRepo = await this.prisma.repository.findUnique({
        where: { id: state.repositoryId },
      });
      if (dbRepo && dbRepo.installationId) {
        installationId = Number(dbRepo.installationId);
      }
    }

    await this.gitOpsService.pushBranch(repoPath, branchName, installationId);
    this.logger.log(`PushBranchNode completed successfully.`);

    return {
      gitOperationStatus: GitOperationStatus.Pushed,
    };
  }
}
