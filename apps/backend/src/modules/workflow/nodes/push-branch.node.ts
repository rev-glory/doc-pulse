import { Injectable, Logger } from '@nestjs/common';
import { GitOperationsService } from '../../git-operations/services/git-operations.service';
import { GitOperationStatus } from '../../../domain/workflow';
import type { WorkflowGraphState } from '../graph/graph.types';

@Injectable()
export class PushBranchNode {
  private readonly logger = new Logger(PushBranchNode.name);

  constructor(private readonly gitOpsService: GitOperationsService) {}

  async invoke(state: WorkflowGraphState): Promise<Partial<WorkflowGraphState>> {
    const runId = state.runId || 'automated';
    const repoPath = state.workspacePath || state.repository?.rootPath || '';
    const branchName = state.branchName || '';

    this.logger.debug(`Executing PushBranchNode for run [${runId}] pushing [${branchName}]...`);

    if (!repoPath || !branchName) {
      throw new Error(`PushBranchNode error: Missing workspacePath or branchName in workflow state.`);
    }

    try {
      await this.gitOpsService.pushBranch(repoPath, branchName);
      this.logger.log(`PushBranchNode completed successfully.`);

      return {
        gitOperationStatus: GitOperationStatus.Pushed,
      };
    } catch (error) {
      this.logger.error(`PushBranchNode failed. Setting status to Failed.`, (error as Error).stack);
      return {
        gitOperationStatus: GitOperationStatus.Failed,
      };
    }
  }
}
