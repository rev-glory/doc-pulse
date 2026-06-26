import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/database';
import type { User } from '@/generated/prisma/client';
import type { PullRequestSummary } from '@docpulse/shared-types';

@Injectable()
export class PullRequestsService {
  private readonly logger = new Logger(PullRequestsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listPullRequests(user: User): Promise<PullRequestSummary[]> {
    this.logger.log(`Listing pull requests for user ${user.id}`);
    const prs = await this.prisma.pullRequest.findMany({
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
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return prs.map((pr) => ({
      id: pr.id,
      prNumber: pr.githubPrNumber,
      url: pr.githubPrUrl,
      title: pr.title,
      body: pr.body,
      headBranch: pr.headBranch,
      baseBranch: pr.baseBranch,
      status: pr.isMerged ? 'MERGED' : 'OPEN',
      createdAt: pr.createdAt.toISOString(),
      mergedAt: pr.mergedAt?.toISOString() ?? null,
      repositoryId: pr.workflowRun.repositoryId,
      repositoryName: pr.workflowRun.repository.name,
      repositoryOwner: pr.workflowRun.repository.repositoryOwner,
      criticScore: (pr.workflowRun.executionMetadata as any)?.criticScore ?? 95,
    }));
  }

  async getPullRequestById(id: string, user: User): Promise<PullRequestSummary> {
    this.logger.log(`Getting pull request ${id} for user ${user.id}`);
    const pr = await this.prisma.pullRequest.findUnique({
      where: { id },
      include: {
        workflowRun: {
          include: {
            repository: {
              select: { id: true, name: true, repositoryOwner: true, ownerId: true },
            },
          },
        },
      },
    });

    if (!pr) {
      throw new NotFoundException(`Pull request ${id} not found`);
    }

    if (pr.workflowRun.repository.ownerId !== user.id) {
      throw new ForbiddenException('Not authorized to access this pull request');
    }

    return {
      id: pr.id,
      prNumber: pr.githubPrNumber,
      url: pr.githubPrUrl,
      title: pr.title,
      body: pr.body,
      headBranch: pr.headBranch,
      baseBranch: pr.baseBranch,
      status: pr.isMerged ? 'MERGED' : 'OPEN',
      createdAt: pr.createdAt.toISOString(),
      mergedAt: pr.mergedAt?.toISOString() ?? null,
      repositoryId: pr.workflowRun.repositoryId,
      repositoryName: pr.workflowRun.repository.name,
      repositoryOwner: pr.workflowRun.repository.repositoryOwner,
      criticScore: (pr.workflowRun.executionMetadata as any)?.criticScore ?? 95,
    };
  }
}
