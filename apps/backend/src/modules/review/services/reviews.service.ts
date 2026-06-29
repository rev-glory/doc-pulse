import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "@/database";
import { WorkflowQueueService } from "../../queue/services/workflow-queue.service";
import { WorkspaceService } from "../../git-operations/services/workspace.service";
import type { User } from "@/generated/prisma/client";
import { ReviewDecisionDto } from "../dto/review-decision.dto";
import { RunStatus as PrismaRunStatus } from "@/generated/prisma/enums";

import { ReviewDetail, RunStatus } from "@docpulse/shared-types";

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowQueueService: WorkflowQueueService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  async listReviews(user: User) {
    this.logger.log(`Listing reviews for user ${user.id}`);
    const reviews = await this.prisma.review.findMany({
      where: {
        workflowRun: {
          repository: {
            ownerId: user.id,
          },
        },
      },
      include: {
        workflowRun: {
          include: {
            repository: {
              select: { id: true, name: true, repositoryOwner: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return reviews.map((r) => {
      let parsed = { reviewer: null, comment: r.comment };
      try {
        if (r.comment && r.comment.startsWith("{")) {
          const raw = JSON.parse(r.comment);
          parsed.reviewer = raw.reviewer ?? null;
          parsed.comment = raw.comment ?? raw.text ?? r.comment;
        }
      } catch {
        // Fallback to raw string
      }

      return {
        id: r.id,
        status: r.status,
        comment: parsed.comment,
        reviewer: parsed.reviewer,
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        workflowRunId: r.workflowRunId,
        repositoryName: r.workflowRun.repository.name,
        repositoryOwner: r.workflowRun.repository.repositoryOwner,
        commitSha: r.workflowRun.commitSha,
        branch: r.workflowRun.branch,
      };
    });
  }

  async getReviewById(id: string, user: User): Promise<ReviewDetail> {
    this.logger.log(`Getting review ${id} for user ${user.id}`);
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        workflowRun: {
          include: {
            repository: {
              select: {
                id: true,
                name: true,
                repositoryOwner: true,
                ownerId: true,
              },
            },
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review ${id} not found`);
    }

    if (review.workflowRun.repository.ownerId !== user.id) {
      throw new BadRequestException("Not authorized to access this review");
    }

    let parsed = { reviewer: null, comment: review.comment };
    try {
      if (review.comment && review.comment.startsWith("{")) {
        const raw = JSON.parse(review.comment);
        parsed.reviewer = raw.reviewer ?? null;
        parsed.comment = raw.comment ?? raw.text ?? review.comment;
      }
    } catch {
      // Fallback
    }

    const snapshot = review.workflowRun.checkpointSnapshot as any;
    const generatedDocuments = snapshot?.generatedDocuments || [];
    const criticReview = snapshot?.criticReview || null;

    return {
      id: review.id,
      status: review.status as any,
      comment: parsed.comment,
      reviewer: parsed.reviewer,
      reviewedAt: review.reviewedAt?.toISOString() ?? null,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      workflowRunId: review.workflowRunId,
      repositoryId: review.workflowRun.repositoryId,
      repositoryName: review.workflowRun.repository.name,
      repositoryOwner: review.workflowRun.repository.repositoryOwner,
      commitSha: review.workflowRun.commitSha,
      branch: review.workflowRun.branch,
      workflowStage: review.workflowRun.currentStage
        ? String(review.workflowRun.currentStage)
        : null,
      workflowStatus: review.workflowRun.status as unknown as RunStatus,
      generatedDocuments,
      criticReview,
    };
  }

  async approveReview(id: string, decision: ReviewDecisionDto, user: User) {
    this.logger.log(`Approving review ${id} by user ${user.id}`);
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { workflowRun: true },
    });

    if (!review) {
      throw new NotFoundException(`Review ${id} not found`);
    }

    if (review.status !== "PENDING") {
      throw new BadRequestException(
        `Review is already in status ${review.status}`,
      );
    }

    const commentJson = JSON.stringify({
      reviewer: user.githubLogin || user.id,
      text: decision.comment || "Approved",
    });

    // 1. Transactionally update review (Invariant 3 atomic guard)
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.review.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          comment: commentJson,
        },
      });

      if (updated.count === 0) {
        throw new BadRequestException("Review is already processed.");
      }
    });

    // 2. Enqueue resume job (run status is updated to RUNNING only inside worker resume startup)
    const repositoryPath = this.workspaceService.getRepositoryPath(
      review.workflowRun.repositoryId,
    );
    await this.workflowQueueService.enqueueWorkflow({
      runId: review.workflowRunId,
      repositoryId: review.workflowRun.repositoryId,
      repositoryPath,
      executionMode: "resume",
      metadata: {
        reviewer: user.githubLogin || user.id,
        resumedAt: new Date().toISOString(),
      },
    });

    return { message: "Review approved and workflow execution resumed" };
  }

  async rejectReview(id: string, decision: ReviewDecisionDto, user: User) {
    this.logger.log(`Rejecting review ${id} by user ${user.id}`);
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { workflowRun: true },
    });

    if (!review) {
      throw new NotFoundException(`Review ${id} not found`);
    }

    const commentJson = JSON.stringify({
      reviewer: user.githubLogin || user.id,
      text: decision.comment || "Rejected",
    });

    // 1. Transactionally update review (Invariant 3 atomic guard)
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.review.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          comment: commentJson,
        },
      });

      if (updated.count === 0) {
        throw new BadRequestException("Review is already processed.");
      }
    });

    // 2. Enqueue loopback resume job to go back to TechnicalWriter
    const repositoryPath = this.workspaceService.getRepositoryPath(
      review.workflowRun.repositoryId,
    );
    await this.workflowQueueService.enqueueWorkflow({
      runId: review.workflowRunId,
      repositoryId: review.workflowRun.repositoryId,
      repositoryPath,
      executionMode: "resume",
      metadata: {
        reviewer: user.githubLogin || user.id,
        resumedAt: new Date().toISOString(),
      },
    });

    return {
      message:
        "Review rejected and workflow execution resumed for document regeneration",
    };
  }
}
