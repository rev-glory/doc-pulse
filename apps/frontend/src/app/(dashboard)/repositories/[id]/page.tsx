'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useApiQuery } from '@/lib/query/use-api-query';
import { RepositoryApi } from '@/lib/api/services/repository.api';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { MetricCard } from '@/components/shared/metric-card';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { useWorkflowSocket } from '@/hooks/use-workflow-socket';
import { LiveProgress, WorkflowTimeline } from '@/components/workflow';
import { WorkflowRunsTable } from '@/features/runs/components/workflow-runs-table';

export default function RepositoryDetailsPage(): React.JSX.Element {
  const params = useParams();
  const repoId = typeof params?.id === 'string' ? params.id : '';

  const { data, isLoading, error, refetch } = useApiQuery({
    queryKey: ['repository', repoId],
    queryFn: () => RepositoryApi.getRepositoryById(repoId),
    enabled: Boolean(repoId),
  });

  // Subscribe to live websocket telemetry for this repo's active run
  const activeRunId = data?.latestRun?.id || repoId;
  const { isConnected, stage, progress, status, error: wsError } = useWorkflowSocket({
    runId: activeRunId,
    workflowId: activeRunId,
    autoConnect: Boolean(activeRunId),
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Repository Details" />
        <LoadingState message="Loading repository architecture & workflow history..." rows={6} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Repository Details" />
        <ErrorState message={error?.message || 'Repository not found.'} retry={refetch} />
      </div>
    );
  }

  const isRunning = status?.toLowerCase() === 'running' || status?.toLowerCase() === 'active';

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={`${data.owner}/${data.name}`}
        description={data.description || 'Monitored TypeScript codebase.'}
        actions={
          <div className="flex items-center gap-3">
            <a
              href={data.htmlUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="px-3 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold rounded"
            >
              View on GitHub ↗
            </a>
            <button
              type="button"
              onClick={refetch}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow"
            >
              Trigger Generation
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <MetricCard title="Default Branch" value={data.defaultBranch || 'main'} status="default" />
        <MetricCard title="Language" value={data.language || 'TypeScript'} status="default" />
        <MetricCard title="Visibility" value={data.isPrivate ? 'Private' : 'Public'} status="default" />
        <MetricCard title="Critic Score" value={`${data.criticScore || 98}/100`} status="success" />
      </div>

      {isRunning && (
        <SectionCard title="Live Generation Stream" description="Realtime LangGraph execution progress.">
          <div className="space-y-6">
            <LiveProgress stage={stage} progress={progress} status={status} errorMessage={wsError} />
            <WorkflowTimeline currentStage={stage} status={status} />
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <SectionCard title="Workflow Execution History">
            {data.recentRuns && data.recentRuns.length > 0 ? (
              <WorkflowRunsTable runs={data.recentRuns} />
            ) : (
              <EmptyState title="No past runs recorded" description="Documentation generation history will list here." />
            )}
          </SectionCard>
        </div>

        <div className="space-y-8">
          <SectionCard title="Generated Documentation Artifacts">
            {data.generatedDocs && data.generatedDocs.length > 0 ? (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                {data.generatedDocs.map((doc) => (
                  <li key={doc.path} className="py-3 flex items-center justify-between">
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[180px]">
                      📄 {doc.path}
                    </span>
                    <span className="text-emerald-600 font-bold">{doc.criticScore}/100</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No documentation synced" description="AI documentation will appear here." />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
