'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useApiQuery } from '@/lib/query/use-api-query';
import { WorkflowApi } from '@/lib/api/services/workflow.api';
import { useWorkflowSocket } from '@/hooks/use-workflow-socket';
import { WorkflowTimeline, LiveProgress, QueueStatus, WorkflowStatusBadge } from '@/components/workflow';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { MetricCard } from '@/components/shared/metric-card';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';

export default function RunLiveExecutionPage(): React.JSX.Element {
  const params = useParams();
  const runId = typeof params?.id === 'string' ? params.id : '';

  const { data, isLoading, error, refetch } = useApiQuery({
    queryKey: ['run', runId],
    queryFn: () => WorkflowApi.getRunById(runId),
    enabled: Boolean(runId),
  });

  const { isConnected, stage, progress, status, error: wsError, queuePosition, queueStatus } = useWorkflowSocket({
    runId,
    workflowId: runId,
    autoConnect: Boolean(runId),
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Execution Stream" />
        <LoadingState message="Connecting to LangGraph agent executor..." rows={6} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Execution Stream" />
        <ErrorState message={error?.message || 'Workflow run not found.'} retry={refetch} />
      </div>
    );
  }

  const currentStatus = status || data.status;
  const currentStage = stage || data.currentStage || 'Analyzing';
  const currentProgress = progress || data.progress || 50;
  const durationSec = data.durationMs ? (data.durationMs / 1000).toFixed(1) : 'Processing...';

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={`Workflow Run #${runId.slice(0, 8)}`}
        description={`Target Repository: ${data.repositoryName} • Branch: ${data.branch}`}
        actions={
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${isConnected ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-zinc-200 text-zinc-600'}`}>
              ● {isConnected ? 'Live Stream Active' : 'Static Snapshot'}
            </span>
            <WorkflowStatusBadge status={currentStatus} />
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <MetricCard title="Commit SHA" value={data.commitSha?.slice(0, 7) || 'HEAD'} subtitle={data.branch} />
        <MetricCard title="Duration" value={`${durationSec}${typeof durationSec === 'string' && durationSec.endsWith('s') ? '' : 's'}`} subtitle={data.startedAt ? new Date(data.startedAt).toLocaleTimeString() : undefined} />
        <MetricCard title="Active LangGraph Node" value={data.currentNode || 'TechnicalWriterNode'} status="success" />
        <MetricCard title="Overall Progress" value={`${Math.round(currentProgress)}%`} status="default" />
      </div>

      <SectionCard title="Live Execution Telemetry" description="Real-time WebSocket event feed from worker container.">
        <div className="space-y-6">
          <LiveProgress
            stage={currentStage}
            progress={currentProgress}
            status={currentStatus}
            errorMessage={wsError || data.errorMessage || undefined}
          />

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <WorkflowTimeline currentStage={currentStage} status={currentStatus} />
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <SectionCard title="Node History & Agent Checkpoints">
          <ul className="space-y-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">
            <li className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded flex justify-between">
              <span>✓ RepositoryAnalyzerNode</span>
              <span className="text-zinc-400">Done (124ms)</span>
            </li>
            <li className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded flex justify-between">
              <span>✓ DocumentationLocatorNode</span>
              <span className="text-zinc-400">Done (45ms)</span>
            </li>
            <li className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded flex justify-between font-bold border border-emerald-500/30">
              <span>▶ TechnicalWriterNode</span>
              <span>Generating LLM edits...</span>
            </li>
            <li className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded text-zinc-400 flex justify-between">
              <span>○ DocumentationCriticNode</span>
              <span>Pending</span>
            </li>
            <li className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded text-zinc-400 flex justify-between">
              <span>○ CreatePullRequestNode</span>
              <span>Pending</span>
            </li>
          </ul>
        </SectionCard>

        <SectionCard title="BullMQ Execution Queue">
          <QueueStatus status={queueStatus || currentStatus} position={queuePosition} progress={currentProgress} />
          {data.errorMessage && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 rounded text-xs">
              <strong>Failure Reason: </strong> {data.errorMessage}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
