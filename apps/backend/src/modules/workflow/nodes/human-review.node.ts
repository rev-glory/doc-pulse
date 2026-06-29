import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/database";
import { WorkflowGraphState } from "../graph/graph.types";
import { RunStatus as PrismaRunStatus } from "@/generated/prisma/enums";

@Injectable()
export class HumanReviewNode {
  private readonly logger = new Logger(HumanReviewNode.name);

  constructor(private readonly prisma: PrismaService) {}

  async invoke(
    state: WorkflowGraphState,
  ): Promise<Partial<WorkflowGraphState>> {
    const runId = state.runId;
    this.logger.debug(`Executing HumanReviewNode for run [${runId}]...`);

    // 1. Check if a review already exists for this run
    let review = await this.prisma.review.findFirst({
      where: { workflowRunId: runId },
    });

    // 2. If it doesn't exist, create it as PENDING and keep the run resumable until the executor checkpoints it.
    if (!review) {
      this.logger.log(
        `No review record found for run [${runId}]. Creating pending review...`,
      );
      review = await this.prisma.review.create({
        data: {
          workflowRunId: runId,
          status: "PENDING",
        },
      });

      // Update the run status in database
      await this.prisma.workflowRun.update({
        where: { id: runId },
        data: { status: PrismaRunStatus.RUNNING },
      });
    }

    // 3. Return the review decision signal the graph actually routes on.
    return {
      humanReviewStatus: review.status,
    };
  }
}
