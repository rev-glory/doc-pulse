import { Injectable, Logger, Optional } from "@nestjs/common";
import { GitOperationsService } from "../../git-operations/services/git-operations.service";
import { GitOperationStatus } from "../../../domain/workflow";
import { PrismaService } from "@/database";
import type { WorkflowGraphState } from "../graph/graph.types";

@Injectable()
export class PushBranchNode {
  private readonly logger = new Logger(PushBranchNode.name);

  constructor(
    private readonly gitOpsService: GitOperationsService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async invoke(
    state: WorkflowGraphState,
  ): Promise<Partial<WorkflowGraphState>> {
    const runId = state.runId || "automated";
    const repoPath = state.workspacePath || state.repository?.rootPath || "";
    const targetBranch = state.targetBranch || "";

    this.logger.debug(
      `Executing PushBranchNode for run [${runId}] pushing [${targetBranch}]...`,
    );

    if (!repoPath || !targetBranch) {
      throw new Error(
        `PushBranchNode error: Missing workspacePath or targetBranch in workflow state.`,
      );
    }

    // Extract installation metadata (fallback to 0 or metadata)
    let installationId = Number(state.metadata?.installationId || 0);

    if (!installationId && this.prisma && this.prisma.repository) {
      const dbRepo = await this.prisma.repository.findUnique({
        where: { id: state.repositoryId },
        include: { installation: true },
      });
      if (dbRepo && dbRepo.installation?.installationId) {
        installationId = Number(dbRepo.installation.installationId);
      }
    }

    await this.gitOpsService.pushBranch(repoPath, targetBranch, installationId);
    this.logger.log(`PushBranchNode completed successfully.`);

    return {
      gitOperationStatus: GitOperationStatus.Pushed,
    };
  }
}
