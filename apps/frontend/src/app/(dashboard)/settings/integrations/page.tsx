'use client';

import React, { useState } from 'react';
import { useApiQuery } from '@/lib/query/use-api-query';
import { GitHubApi } from '@/lib/api/services/github.api';
import { RepositoryApi } from '@/lib/api/services/repository.api';
import { DashboardApi } from '@/lib/api/services/dashboard.api';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
export default function IntegrationsDashboardPage(): React.JSX.Element {
  const {
    data: installations,
    isLoading: isInstLoading,
    error: instError,
    refetch: refetchInst,
  } = useApiQuery({
    queryKey: ['github', 'installations'],
    queryFn: GitHubApi.getInstallations,
  });

  const {
    data: repositories,
    isLoading: isRepoLoading,
    error: repoError,
    refetch: refetchRepo,
  } = useApiQuery({
    queryKey: ['repositories', 'list'],
    queryFn: RepositoryApi.listRepositories,
  });

  const {
    data: settings,
    isLoading: isSettingsLoading,
    error: settingsError,
  } = useApiQuery({
    queryKey: ['dashboard', 'settings'],
    queryFn: DashboardApi.getSettings,
  });

  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncSummary, setSyncSummary] = useState<{
    synced: number;
    created: number;
    updated: number;
  } | null>(null);

  if (isInstLoading || isRepoLoading || isSettingsLoading) {
    return (
      <div>
        <PageHeader title="Integrations" />
        <LoadingState message="Loading integration telemetry..." rows={6} />
      </div>
    );
  }

  if (instError || repoError || settingsError) {
    const errorMsg =
      instError?.message || repoError?.message || settingsError?.message || 'Failed to load integration states.';
    return (
      <div>
        <PageHeader title="Integrations" />
        <ErrorState message={errorMsg} retry={() => { refetchInst(); refetchRepo(); }} />
      </div>
    );
  }

  const handleSync = async (installationId: number) => {
    setSyncingId(installationId);
    setSyncSummary(null);
    try {
      const summary = await RepositoryApi.syncInstallationRepositories(installationId);
      setSyncSummary(summary);
      refetchRepo();
    } catch (err: any) {
      alert(`Manual sync failed: ${err.message}`);
      setSyncingId(null);
    }
  };

  const handleCloseSyncOverlay = () => {
    setSyncingId(null);
    setSyncSummary(null);
  };

  const hasInstallations = installations && installations.length > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="GitHub Integrations"
        description="Monitor and synchronize GitHub App installations and webhook status."
      />

      {/* Syncing progress overlay */}
      {syncingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md animate-fade-in p-4">
          <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-8 text-zinc-800 dark:text-zinc-100 text-center">
            {syncSummary === null ? (
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-full border-4 border-zinc-200 border-t-emerald-500 animate-spin mx-auto" />
                <div>
                  <h3 className="text-lg font-bold">Synchronizing Repositories</h3>
                  <p className="text-xs text-zinc-400 mt-2">
                    Querying GitHub installation endpoints and mapping repository schemas...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl font-bold mx-auto border border-emerald-500/25">
                  ✓
                </div>
                <div>
                  <h3 className="text-lg font-bold">Synchronization Complete</h3>
                  <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl space-y-2 text-xs font-medium">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Total Synced</span>
                      <span className="font-bold">{syncSummary.synced}</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-900 pt-2">
                      <span className="text-zinc-400">New Connected</span>
                      <span className="font-bold text-emerald-600">{syncSummary.created}</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-900 pt-2">
                      <span className="text-zinc-400">Updated</span>
                      <span className="font-bold text-amber-600">{syncSummary.updated}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseSyncOverlay}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-xs rounded-lg shadow transition-all"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Columns: Installations List & Repo Connection */}
        <div className="lg:col-span-2 space-y-8">
          <SectionCard title="Active Installations" description="Target profiles connected to DocPulse.">
            {!hasInstallations ? (
              <EmptyState
                title="No GitHub App installations found"
                description="Install the DocPulse GitHub App on your profile or organization to get started."
              />
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {installations.map((inst) => {
                  const instRepos = repositories?.filter((r) => r.isActive && r.fullName.startsWith(`${inst.accountLogin}/`)) || [];

                  return (
                    <div key={inst.id} className="py-5 first:pt-0 last:pb-0 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold flex items-center justify-center text-sm">
                            {inst.accountLogin.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                              {inst.accountLogin}
                            </h4>
                            <p className="text-xs text-zinc-400">
                              {inst.accountType} Account • ID: {inst.installationId}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSync(inst.installationId)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                          >
                            Sync Repositories
                          </button>
                        </div>
                      </div>

                      {/* Repos Grid for this installation */}
                      {instRepos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          {instRepos.map((repo) => (
                            <div
                              key={repo.id}
                              className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-lg text-xs flex justify-between items-center"
                            >
                              <div>
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200 block truncate max-w-[150px]">
                                  {repo.name}
                                </span>
                                <span className="text-[10px] text-zinc-400">
                                  Default: {repo.defaultBranch}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                                Synced
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400 italic pt-1">
                          No repositories synchronized yet. Trigger sync to fetch repositories.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column: Webhook health metrics and app configurations */}
        <div className="space-y-8">
          <SectionCard title="Operational Webhooks" description="Delivery system logs & active config.">
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                <span className="font-bold">Webhook Listener Connection</span>
                <span className="font-black text-emerald-600">ACTIVE</span>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-850">
                  <span className="text-zinc-500 dark:text-zinc-400 font-semibold">GitHub App ID</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300 font-bold">{settings?.workflow.appId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-850">
                  <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Trigger event</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300 font-bold uppercase">{settings?.workflow.triggerEvent}</span>
                </div>
                <div className="py-2.5">
                  <span className="block text-zinc-500 dark:text-zinc-400 font-semibold mb-1.5">Callback endpoint</span>
                  <span className="block font-mono bg-zinc-100 dark:bg-zinc-950 p-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 break-all select-all rounded">
                    {settings?.workflow.webhookUrl}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
