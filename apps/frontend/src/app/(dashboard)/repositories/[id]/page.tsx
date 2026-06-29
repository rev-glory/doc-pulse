'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useApiQuery } from '@/lib/query/use-api-query';
import {
  RepositoryApi,
  type RepositoryConfig,
  type UpdateRepositoryDto,
} from '@/lib/api/services/repository.api';
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

  /* ── Core data: use the raw config endpoint so we see all DTO fields ── */
  const { data, isLoading, error, refetch } = useApiQuery<RepositoryConfig>({
    queryKey: ['repository', repoId, 'config'],
    queryFn: () => RepositoryApi.getRepositoryConfig(repoId),
    enabled: Boolean(repoId),
  });

  /* ── Live websocket for active run ── */
  const activeRunId = repoId;
  const { isConnected, stage, progress, status, error: wsError } = useWorkflowSocket({
    runId: activeRunId,
    workflowId: activeRunId,
    autoConnect: Boolean(activeRunId),
  });

  /* ── Edit form state ── */
  const [isEditing, setIsEditing] = useState(false);
  const [branchStrategy, setBranchStrategy] = useState<'DOCUMENTATION_BRANCH' | 'CURRENT_BRANCH'>('DOCUMENTATION_BRANCH');
  const [documentationBranchName, setDocumentationBranchName] = useState('');
  const [documentationDirectory, setDocumentationDirectory] = useState('docs');
  const [docPathsRaw, setDocPathsRaw] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  /* ── Activate/Deactivate state ── */
  const [isToggling, setIsToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  /* Populate form when data loads */
  useEffect(() => {
    if (data) {
      setBranchStrategy(data.branchStrategy || 'DOCUMENTATION_BRANCH');
      setDocumentationBranchName(data.documentationBranchName || '');
      setDocumentationDirectory(data.documentationDirectory || 'docs');
      setDocPathsRaw((data.docPaths || []).join('\n'));
    }
  }, [data]);

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

  /* ── Handlers ── */
  const handleToggleActive = async () => {
    setIsToggling(true);
    setToggleError(null);
    try {
      if (data.isActive) {
        await RepositoryApi.deactivateRepository(repoId);
      } else {
        await RepositoryApi.activateRepository(repoId);
      }
      refetch();
    } catch (e: any) {
      setToggleError(e?.message || 'Failed to toggle activation.');
    } finally {
      setIsToggling(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const dto: UpdateRepositoryDto = {
      branchStrategy,
      documentationDirectory,
      documentationBranchName:
        branchStrategy === 'DOCUMENTATION_BRANCH' ? documentationBranchName || null : null,
      docPaths: docPathsRaw
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean),
    };

    try {
      await RepositoryApi.updateRepository(repoId, dto);
      setSaveSuccess(true);
      setIsEditing(false);
      refetch();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e: any) {
      setSaveError(e?.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={`${data.repositoryOwner}/${data.name}`}
        description={data.description || 'Monitored repository for automated documentation generation.'}
        actions={
          <div className="flex items-center gap-3">
            <a
              href={data.htmlUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="px-3 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold rounded transition-all"
            >
              View on GitHub ↗
            </a>
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={isToggling}
              className={`px-3 py-2 text-xs font-bold rounded shadow transition-all disabled:opacity-50 ${
                data.isActive
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isToggling ? 'Updating…' : data.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        }
      />

      {toggleError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-300 rounded text-xs">
          ⚠️ {toggleError}
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-300 rounded text-xs font-bold">
          ✓ Repository settings saved successfully!
        </div>
      )}

      {/* Top Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <MetricCard title="Default Branch" value={data.defaultBranch || 'main'} status="default" />
        <MetricCard title="Language" value={data.language || '—'} status="default" />
        <MetricCard title="Visibility" value={data.visibility || (data.private ? 'Private' : 'Public')} status="default" />
        <MetricCard
          title="Status"
          value={data.isActive ? 'Active' : 'Inactive'}
          status={data.isActive ? 'success' : 'default'}
        />
      </div>

      {/* Live stream — only if a run is active */}
      {isRunning && (
        <SectionCard title="Live Generation Stream" description="Realtime LangGraph execution progress.">
          <div className="space-y-6">
            <LiveProgress stage={stage} progress={progress} status={status} errorMessage={wsError} />
            <WorkflowTimeline currentStage={stage} status={status} />
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Workflow execution history */}
          <SectionCard title="Workflow Execution History">
            <EmptyState title="No past runs recorded" description="Documentation generation history will list here." />
          </SectionCard>

          {/* Documentation settings edit form */}
          <SectionCard
            title="Documentation Settings"
            description="Configure how DocPulse writes generated documentation for this repository."
          >
            {!isEditing ? (
              <div className="space-y-4">
                {/* Display current config */}
                <div className="space-y-3 text-xs">
                  {[
                    { label: 'Branch Strategy', value: data.branchStrategy },
                    { label: 'Documentation Branch', value: data.documentationBranchName || '—' },
                    { label: 'Documentation Directory', value: data.documentationDirectory },
                    { label: 'Clone URL', value: data.cloneUrl },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-start py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                      <span className="font-semibold text-zinc-500 dark:text-zinc-400 shrink-0">{label}</span>
                      <span className="font-mono text-zinc-800 dark:text-zinc-200 text-right break-all max-w-[55%]">{value}</span>
                    </div>
                  ))}

                  {/* docPaths */}
                  <div className="py-2.5">
                    <span className="block font-semibold text-zinc-500 dark:text-zinc-400 text-xs mb-2">
                      Documentation Paths ({data.docPaths?.length || 0})
                    </span>
                    {data.docPaths && data.docPaths.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {data.docPaths.map((p) => (
                          <span key={p} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px] rounded text-zinc-700 dark:text-zinc-300">
                            {p}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-zinc-400 italic text-xs">No specific paths configured (full repo scanned)</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-sm transition-all"
                >
                  ✎ Edit Settings
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
                {saveError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-300 rounded">
                    ⚠️ {saveError}
                  </div>
                )}

                {/* Branch Strategy */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
                    Branch Strategy
                  </label>
                  <select
                    value={branchStrategy}
                    onChange={(e) => setBranchStrategy(e.target.value as any)}
                    className="w-full p-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="DOCUMENTATION_BRANCH">DOCUMENTATION_BRANCH — dedicated docs branch</option>
                    <option value="CURRENT_BRANCH">CURRENT_BRANCH — commit directly to source branch</option>
                  </select>
                </div>

                {/* Documentation Branch Name (only for DOCUMENTATION_BRANCH) */}
                {branchStrategy === 'DOCUMENTATION_BRANCH' && (
                  <div className="space-y-1.5">
                    <label className="block font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
                      Documentation Branch Name
                    </label>
                    <input
                      type="text"
                      value={documentationBranchName}
                      onChange={(e) => setDocumentationBranchName(e.target.value)}
                      placeholder="e.g. docpulse/docs"
                      className="w-full p-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Documentation Directory */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
                    Documentation Directory
                  </label>
                  <input
                    type="text"
                    value={documentationDirectory}
                    onChange={(e) => setDocumentationDirectory(e.target.value)}
                    placeholder="e.g. docs"
                    className="w-full p-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-zinc-400 text-[10px]">Relative directory path where docs are written inside the repo.</span>
                </div>

                {/* Doc Paths */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
                    Documentation Paths (one per line)
                  </label>
                  <textarea
                    value={docPathsRaw}
                    onChange={(e) => setDocPathsRaw(e.target.value)}
                    rows={4}
                    placeholder={"src/\nlib/\npackages/"}
                    className="w-full p-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                  />
                  <span className="text-zinc-400 text-[10px]">Paths to include in doc generation. Leave empty to scan whole repo.</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded shadow-sm transition-all"
                  >
                    {isSaving ? 'Saving…' : '✓ Save Settings'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsEditing(false); setSaveError(null); }}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </SectionCard>
        </div>

        {/* Sidebar column */}
        <div className="space-y-8">
          {/* Repository metadata card */}
          <SectionCard title="Repository Info" description="GitHub metadata and webhook status.">
            <div className="space-y-0 text-xs">
              {[
                { label: 'Full Name', value: data.fullName },
                { label: 'GitHub Repo ID', value: String(data.githubRepositoryId) },
                {
                  label: 'Last Synced',
                  value: data.lastSyncedAt
                    ? new Date(data.lastSyncedAt).toLocaleString()
                    : 'Never',
                },
                {
                  label: 'Created At',
                  value: new Date(data.createdAt).toLocaleDateString(),
                },
                {
                  label: 'Updated At',
                  value: new Date(data.updatedAt).toLocaleDateString(),
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between items-center py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                >
                  <span className="text-zinc-500 dark:text-zinc-400 font-semibold">{label}</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300 text-right">{value}</span>
                </div>
              ))}

              {/* Webhook status */}
              <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Webhook</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      data.isWebhookActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                    }`}
                  />
                  <span
                    className={`font-bold ${
                      data.isWebhookActive ? 'text-emerald-600' : 'text-zinc-400'
                    }`}
                  >
                    {data.isWebhookActive
                      ? `Active #${data.webhookId}`
                      : data.webhookId
                      ? `Inactive #${data.webhookId}`
                      : 'Not registered'}
                  </span>
                </div>
              </div>

              {/* Live socket badge */}
              <div className="flex justify-between items-center py-2.5">
                <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Socket Stream</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isConnected
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {isConnected ? 'Live' : 'Static'}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Generated documentation artifacts */}
          <SectionCard title="Generated Documentation">
            <EmptyState title="No documentation synced" description="AI documentation will appear here after the first run." />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
