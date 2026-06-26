'use client';

import React from 'react';
import { useApiQuery } from '@/lib/query/use-api-query';
import { DashboardApi } from '@/lib/api/services/dashboard.api';
import { PageHeader } from '@/components/shared/page-header';
import { MetricCard } from '@/components/shared/metric-card';
import { SectionCard } from '@/components/shared/section-card';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { QueueStatus } from '@/components/workflow/queue-status';
import { WorkflowRunsTable } from '@/features/runs/components/workflow-runs-table';
import { RecentPullRequests } from '@/features/pull-requests/components/recent-pull-requests';

export default function DashboardOverviewPage(): React.JSX.Element {
  const { data, isLoading, error, refetch } = useApiQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: DashboardApi.getStats,
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Overview" description="Real-time AI documentation engine status." />
        <LoadingState message="Aggregating workspace telemetry..." rows={5} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Overview" />
        <ErrorState message={error?.message || 'Failed to load dashboard metrics.'} retry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Command Center"
        description="Autonomous LangGraph documentation orchestration live telemetry."
        actions={
          <button
            type="button"
            onClick={refetch}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold rounded-md shadow transition-all"
          >
            ↻ Refresh Feed
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Connected Repositories"
          value={data.totalRepositories || 0}
          subtitle="Active GitHub installations"
          status="default"
        />
        <MetricCard
          title="Active Workflows"
          value={data.activeWorkflows || 0}
          subtitle="Currently running AI agents"
          status={data.activeWorkflows > 0 ? 'success' : 'default'}
          trend={data.activeWorkflows > 0 ? 'Live Processing' : undefined}
        />
        <MetricCard
          title="Completed Runs"
          value={data.completedWorkflows || 0}
          subtitle="Docs successfully synced"
          status="success"
        />
        <MetricCard
          title="Failed Executions"
          value={data.failedWorkflows || 0}
          subtitle="Requiring manual inspection"
          status={data.failedWorkflows > 0 ? 'danger' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <SectionCard title="Recent Workflow Runs" description="Realtime AI execution trajectory log.">
            {data.recentRuns && data.recentRuns.length > 0 ? (
              <WorkflowRunsTable runs={data.recentRuns} />
            ) : (
              <EmptyState title="No executions recorded" description="Push a commit to a synced repository to trigger AI analysis." />
            )}
          </SectionCard>
        </div>

        <div className="space-y-8">
          <SectionCard title="BullMQ Queue Status" description="Background job processor throughput.">
            <QueueStatus
              status={data.queueStatus?.status || 'idle'}
              position={data.queueStatus?.waitingJobs || 0}
              progress={data.activeWorkflows > 0 ? 50 : 100}
            />
            <div className="mt-4 grid grid-cols-2 gap-2 text-center pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              <div className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded">
                <span className="block text-zinc-400">Active</span>
                <span className="font-bold text-emerald-600">{data.queueStatus?.activeJobs || 0}</span>
              </div>
              <div className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded">
                <span className="block text-zinc-400">Waiting</span>
                <span className="font-bold text-amber-600">{data.queueStatus?.waitingJobs || 0}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Generated Pull Requests" description="Documentation updates delivered to GitHub.">
            <RecentPullRequests pullRequests={data.recentPullRequests || []} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
