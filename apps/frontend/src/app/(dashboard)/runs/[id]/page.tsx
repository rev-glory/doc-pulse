'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
        <PageHeader title="Workflow Execution detail" />
        <LoadingState message="Connecting to LangGraph agent executor..." rows={6} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Workflow Execution detail" />
        <ErrorState message={error?.message || 'Workflow run not found.'} retry={refetch} />
      </div>
    );
  }

  const currentStatus = status || data.status;
  const currentStage = stage || data.currentStage || 'Queued';
  const currentProgress = progress || data.progress || 0;
  const durationSec = data.durationMs ? (data.durationMs / 1000).toFixed(1) : 'Processing...';

  // LangGraph sequential pipeline nodes mapping
  const SEQUENTIAL_NODES = [
    'RepositoryAnalyzer',
    'DocumentationLocator',
    'TechnicalWriter',
    'DocumentationCritic',
    'HumanReview',
    'GitCommit',
    'PushBranch',
    'CreatePullRequest',
  ];

  const completedNodes = data.completedNodes || [];
  const currentNode = data.currentNode;

  const getNodeState = (nodeName: string): 'completed' | 'active' | 'failed' | 'pending' => {
    if (completedNodes.includes(nodeName)) {
      return 'completed';
    }

    const isCurrent = currentNode === nodeName;
    if (isCurrent) {
      if (currentStatus === 'FAILED') return 'failed';
      if (currentStatus === 'RUNNING' || currentStatus === 'WAITING_FOR_REVIEW' || currentStatus === 'CHECKPOINTED') {
        return 'active';
      }
    }

    return 'pending';
  };

  const generatedDocs = data.generatedDocuments || [];
  const criticReview = data.criticReview || null;

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={`Workflow Run #${runId.slice(0, 8)}`}
        description={`Target Repository: ${data.repositoryOwner}/${data.repositoryName} • Branch: ${data.branch}`}
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
        <MetricCard title="Active LangGraph Node" value={data.currentNode || 'Queued'} status="success" />
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

          <div className="pt-4 border-t border-zinc-150 dark:border-zinc-800">
            <WorkflowTimeline currentStage={currentStage} status={currentStatus} />
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Dynamic Timeline Checkpoints list */}
        <SectionCard title="Node History & Agent Checkpoints" description="Dynamic execution logs mapped from LangGraph checkpoint state.">
          <ul className="space-y-3 font-mono text-xs">
            {SEQUENTIAL_NODES.map((nodeName) => {
              const state = getNodeState(nodeName);

              return (
                <li
                  key={nodeName}
                  className={`p-3 rounded-lg border flex justify-between items-center transition-all ${
                    state === 'completed'
                      ? 'bg-zinc-50 border-zinc-200 text-zinc-800 dark:bg-zinc-900/50 dark:border-zinc-850 dark:text-zinc-300'
                      : state === 'active'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-300 font-bold animate-pulse'
                      : state === 'failed'
                      ? 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-300 font-bold'
                      : 'bg-zinc-50/50 border-zinc-200/50 text-zinc-400 dark:bg-zinc-900/20 dark:border-zinc-850/50 dark:text-zinc-650'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">
                      {state === 'completed' ? '✓' : state === 'active' ? '▶' : state === 'failed' ? '✕' : '○'}
                    </span>
                    <span>{nodeName}Node</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider">
                    {state === 'completed' ? 'Done' : state === 'active' ? 'Active' : state === 'failed' ? 'Failed' : 'Pending'}
                  </span>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        {/* Checkpoint inspector */}
        <div className="space-y-6">
          <SectionCard title="Checkpoint Snapshot Information" description="Serialized documentation inventory, rating profiles, and SCM outputs.">
            <div className="space-y-5 text-xs">
              {/* Generated Docs summary */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Generated Documentation ({generatedDocs.length})</h4>
                {generatedDocs.length > 0 ? (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                    {generatedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded flex justify-between items-center"
                      >
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">📄 {doc.path}</span>
                        <span className="font-mono text-[10px] text-zinc-450 bg-zinc-100 dark:bg-zinc-800 px-1 rounded">{doc.type}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-400 italic">No document generated yet.</p>
                )}
              </div>

              {/* Critic Score summary */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-850">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Critic Audit Review</h4>
                {criticReview ? (
                  <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg">
                    <div>
                      <span className="font-bold text-zinc-800 dark:text-zinc-250 block">AI Critic score</span>
                      <span className="text-[10px] text-zinc-400">{criticReview.approvedCount} Approved • {criticReview.failedCount} Refused</span>
                    </div>
                    <span className={`text-lg font-black ${criticReview.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {criticReview.score}/100
                    </span>
                  </div>
                ) : (
                  <p className="text-zinc-400 italic">Critic Review report pending.</p>
                )}
              </div>

              {/* Associated Pull Request or Review redirect action */}
              {currentStatus === 'WAITING_FOR_REVIEW' && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-850">
                  <Link
                    href={`/reviews`}
                    className="w-full text-center block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all"
                  >
                    📝 Open Review Workspace to Approve
                  </Link>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="BullMQ Execution Queue">
            <QueueStatus status={queueStatus || currentStatus} position={queuePosition} progress={currentProgress} />
            {data.errorMessage && (
              <div className="mt-4 p-3.5 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/40 text-red-800 dark:text-red-300 rounded-lg text-xs leading-relaxed">
                <strong>Failure Reason: </strong> {data.errorMessage}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
