import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/database';
import type { User } from '@/generated/prisma/client';
import { RunStatus, WorkflowRunSummary } from '@docpulse/shared-types';

@Injectable()
export class RunsService {
  private readonly logger = new Logger(RunsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listRuns(user: User): Promise<WorkflowRunSummary[]> {
    this.logger.log(`Listing workflow runs for user ${user.id}`);
    const runs = await this.prisma.workflowRun.findMany({
      where: {
        repository: {
          ownerId: user.id,
        },
      },
      include: {
        repository: {
          select: { id: true, name: true, repositoryOwner: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return runs.map((r) => ({
      id: r.id,
      correlationId: r.correlationId,
      commitSha: r.commitSha,
      branch: r.branch,
      commitMessage: r.commitMessage,
      status: r.status as unknown as RunStatus,
      currentStage: r.currentStage ? String(r.currentStage) : null,
      currentNode: r.currentNode,
      progress: (r.executionMetadata as any)?.progress ?? (r.status === 'COMPLETED' ? 100 : r.status === 'RUNNING' ? 50 : 0),
      startedAt: r.startedAt?.toISOString() ?? r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      durationMs: r.startedAt && r.completedAt ? r.completedAt.getTime() - r.startedAt.getTime() : null,
      repositoryId: r.repositoryId,
      repositoryName: r.repository.name,
      repositoryOwner: r.repository.repositoryOwner,
      errorMessage: r.errorMessage,
      completedNodes: (r.checkpointSnapshot as any)?.completedNodes || [],
      pullRequestUrl: r.pullRequestUrl ?? undefined,
      gitOperationStatus: r.gitOperationStatus ?? undefined,
    }));
  }

  async getRunById(id: string, user: User): Promise<WorkflowRunSummary> {
    this.logger.log(`Getting workflow run ${id} for user ${user.id}`);
    const run = await this.prisma.workflowRun.findUnique({
      where: { id },
      include: {
        repository: {
          select: { id: true, name: true, repositoryOwner: true, ownerId: true },
        },
      },
    });

    if (!run) {
      throw new NotFoundException(`Workflow run ${id} not found`);
    }

    if (run.repository.ownerId !== user.id) {
      throw new ForbiddenException('Not authorized to access this workflow run');
    }

    const snapshot = run.checkpointSnapshot as any;
    const generatedDocuments = snapshot?.generatedDocuments || [];
    const criticReview = snapshot?.criticReview || null;
    const completedNodes = snapshot?.completedNodes || [];

    return {
      id: run.id,
      correlationId: run.correlationId,
      commitSha: run.commitSha,
      branch: run.branch,
      commitMessage: run.commitMessage,
      status: run.status as unknown as RunStatus,
      currentStage: run.currentStage ? String(run.currentStage) : null,
      currentNode: run.currentNode,
      progress: (run.executionMetadata as any)?.progress ?? (run.status === 'COMPLETED' ? 100 : run.status === 'RUNNING' ? 50 : 0),
      startedAt: run.startedAt?.toISOString() ?? run.createdAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      durationMs: run.startedAt && run.completedAt ? run.completedAt.getTime() - run.startedAt.getTime() : null,
      repositoryId: run.repositoryId,
      repositoryName: run.repository.name,
      repositoryOwner: run.repository.repositoryOwner,
      errorMessage: run.errorMessage,
      generatedDocuments,
      criticReview,
      completedNodes,
      pullRequestUrl: run.pullRequestUrl ?? undefined,
      gitOperationStatus: run.gitOperationStatus ?? undefined,
    };
  }
}
