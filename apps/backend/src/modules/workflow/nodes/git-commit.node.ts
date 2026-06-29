import { Injectable, Logger } from "@nestjs/common";
import { DocumentationWriterService } from "../../git-operations/services/documentation-writer.service";
import { GitOperationsService } from "../../git-operations/services/git-operations.service";
import { GitOperationStatus } from "../../../domain/workflow";
import type {
  WorkflowGraphState,
  WorkflowExecutionConfig,
} from "../graph/graph.types";

@Injectable()
export class GitCommitNode {
  private readonly logger = new Logger(GitCommitNode.name);

  constructor(
    private readonly writerService: DocumentationWriterService,
    private readonly gitOpsService: GitOperationsService,
  ) {}

  async invoke(
    state: WorkflowGraphState,
    ctx?: WorkflowExecutionConfig,
  ): Promise<Partial<WorkflowGraphState>> {
    const runId = state.runId || "automated";
    const repoPath = state.workspacePath || state.repository?.rootPath || "";
    const docs = state.generatedDocuments || [];

    this.logger.debug(`Executing GitCommitNode for run [${runId}]...`);

    if (!repoPath) {
      throw new Error(
        `GitCommitNode error: No workspacePath defined in workflow state.`,
      );
    }

    // Resolve target branch based on configuration strategy
    let targetBranch: string;
    if (ctx) {
      if (ctx.branchStrategy === "CURRENT_BRANCH") {
        const branch = state.metadata?.branch as string | undefined;
        if (!branch) {
          throw new Error(
            "Unable to determine triggering branch for CURRENT_BRANCH strategy.",
          );
        }
        targetBranch = branch;
      } else {
        targetBranch = ctx.documentationBranchName || "docpulse/docs";
      }
    } else {
      // Fallback/safety for test mocks
      targetBranch = state.targetBranch || "docpulse/docs";
    }

    // 1. Write docs transactionally
    const writeResult = await this.writerService.writeDocuments(
      repoPath,
      runId,
      docs,
      ctx?.documentationDirectory,
    );

    // 2. Commit changes
    const commitResult = await this.gitOpsService.commitChanges(
      repoPath,
      runId,
      writeResult.writtenFiles,
      targetBranch,
    );

    this.logger.log(
      `GitCommitNode completed successfully [branch: ${commitResult.branchName}, sha: ${commitResult.commitSha}]`,
    );

    return {
      targetBranch: commitResult.branchName,
      commitSha: commitResult.commitSha,
      gitOperationStatus: GitOperationStatus.Committed,
    };
  }
}
