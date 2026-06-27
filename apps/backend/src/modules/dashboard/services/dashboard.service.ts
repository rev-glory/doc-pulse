import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database';
import type { User } from '@/generated/prisma/client';
import type { DashboardStats, DashboardSettings } from '@docpulse/shared-types';
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
        this.prisma.repository.count({ where: { ownerId: user.id, isActive: true, installation: { isActive: true } } }),
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

  async getSettings(): Promise<DashboardSettings> {
    this.logger.log('Getting dashboard settings');
    return {
      general: {
        theme: 'dark',
        defaultBranch: 'main',
      },
      models: {
        activeModel: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
        temperature: 0.2,
      },
      workflow: {
        triggerEvent: 'push',
        webhookUrl: process.env.GITHUB_WEBHOOK_URL || 'http://localhost:3001/github/webhooks',
        appId: process.env.GITHUB_APP_ID || '123456',
      },
      performance: {
        concurrencyLimit: 3,
        retryLimit: 5,
      },
    };
  }
}
