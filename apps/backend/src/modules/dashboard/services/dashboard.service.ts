import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database';
import type { User } from '@/generated/prisma/client';
import type { DashboardStats } from '@docpulse/shared-types';
import { RunsService } from '@/modules/runs/services/runs.service';
import { PullRequestsService } from '@/modules/pull-requests/services/pull-requests.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runsService: RunsService,
    private readonly pullRequestsService: PullRequestsService,
  ) {}

  async getDashboardStats(user: User): Promise<DashboardStats> {
    this.logger.log(`Getting dashboard stats for user ${user.id}`);

    const [totalRepositories, activeWorkflows, completedWorkflows, failedWorkflows, recentRuns, recentPullRequests] =
      await Promise.all([
        this.prisma.repository.count({ where: { ownerId: user.id, isActive: true } }),
        this.prisma.workflowRun.count({ where: { repository: { ownerId: user.id }, status: 'RUNNING' } }),
        this.prisma.workflowRun.count({ where: { repository: { ownerId: user.id }, status: 'COMPLETED' } }),
        this.prisma.workflowRun.count({ where: { repository: { ownerId: user.id }, status: 'FAILED' } }),
        this.runsService.listRuns(user),
        this.pullRequestsService.listPullRequests(user),
      ]);

    const queuedCount = await this.prisma.workflowRun.count({
      where: { repository: { ownerId: user.id }, status: 'QUEUED' },
    });

    return {
      totalRepositories,
      activeWorkflows,
      completedWorkflows,
      failedWorkflows,
      queueStatus: {
        activeJobs: activeWorkflows,
        waitingJobs: queuedCount,
        completedJobs: completedWorkflows,
        failedJobs: failedWorkflows,
        status: activeWorkflows > 0 ? 'active' : queuedCount > 0 ? 'waiting' : 'idle',
      },
      recentRuns: recentRuns.slice(0, 10),
      recentPullRequests: recentPullRequests.slice(0, 5),
    };
  }
}
