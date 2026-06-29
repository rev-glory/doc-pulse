'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApiQuery } from '@/lib/query/use-api-query';
import { GitHubApi } from '@/lib/api/services/github.api';
import { RepositoryApi, type RepositoryConfig, type ConnectRepositoryDto } from '@/lib/api/services/repository.api';
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

  // Use the raw config endpoint so we get all repository fields
  const {
    data: repositoriesRaw,
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

  // Sync state per installation
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncSummary, setSyncSummary] = useState<{
    synced: number;
    created: number;
    updated: number;
  } | null>(null);

  // Connect form state per installation
  const [connectingInstId, setConnectingInstId] = useState<string | null>(null);
  const [connectRepoOwner, setConnectRepoOwner] = useState('');
  const [connectRepoName, setConnectRepoName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);

  // Expanded repo detail per installation
  const [expandedRepoId, setExpandedRepoId] = useState<string | null>(null);
  const [repoConfigMap, setRepoConfigMap] = useState<Record<string, RepositoryConfig>>({});
  const [loadingConfigId, setLoadingConfigId] = useState<string | null>(null);

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

  const openConnectForm = (instId: string, accountLogin: string) => {
    setConnectingInstId(instId);
    setConnectRepoOwner(accountLogin);
    setConnectRepoName('');
    setConnectError(null);
    setConnectSuccess(null);
  };

  const handleConnectRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectingInstId) return;
    setIsConnecting(true);
    setConnectError(null);
    setConnectSuccess(null);

    const dto: ConnectRepositoryDto = {
      installationId: connectingInstId,
      owner: connectRepoOwner.trim(),
      repositoryName: connectRepoName.trim(),
    };

    try {
      const result = await RepositoryApi.connectRepository(dto);
      setConnectSuccess(`✓ Connected "${result.fullName}" successfully!`);
      setConnectRepoName('');
      refetchRepo();
    } catch (err: any) {
      setConnectError(err?.message || 'Failed to connect repository.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleToggleRepoExpand = async (repoId: string) => {
    if (expandedRepoId === repoId) {
      setExpandedRepoId(null);
      return;
    }
    setExpandedRepoId(repoId);
    if (!repoConfigMap[repoId]) {
      setLoadingConfigId(repoId);
      try {
        const config = await RepositoryApi.getRepositoryConfig(repoId);
        setRepoConfigMap((prev) => ({ ...prev, [repoId]: config }));
      } catch {
        // ignore
      } finally {
        setLoadingConfigId(null);
      }
    }
  };

  const hasInstallations = installations && installations.length > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="GitHub Integrations"
        description="Monitor and synchronize GitHub App installations, webhook status, and repository configurations."
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
        {/* Left Columns: Installations List */}
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
                  const instRepos = repositoriesRaw?.filter(
                    (r) => r.fullName.startsWith(`${inst.accountLogin}/`)
                  ) || [];

                  return (
                    <div key={inst.id} className="py-5 first:pt-0 last:pb-0 space-y-5">
                      {/* Installation header */}
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
                              {inst.accountType} Account • Installation ID: {inst.installationId}
                            </p>
                            <p className="text-[10px] text-zinc-400 font-mono">
                              DB ID: {inst.id}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openConnectForm(inst.id, inst.accountLogin)}
                            className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                          >
                            + Connect Repo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSync(inst.installationId)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                          >
                            Sync All
                          </button>
                        </div>
                      </div>

                      {/* Connect form (inline, per installation) */}
                      {connectingInstId === inst.id && (
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 space-y-4 animate-fade-in">
                          <h5 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                            Connect Repository to {inst.accountLogin}
                          </h5>
                          {connectSuccess && (
                            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-300 rounded text-xs font-bold">
                              {connectSuccess}
                            </div>
                          )}
                          {connectError && (
                            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-300 rounded text-xs">
                              ⚠️ {connectError}
                            </div>
                          )}
                          <form onSubmit={handleConnectRepository} className="flex flex-col sm:flex-row gap-3 items-end">
                            <div className="flex-1 space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Owner</label>
                              <input
                                type="text"
                                value={connectRepoOwner}
                                onChange={(e) => setConnectRepoOwner(e.target.value)}
                                placeholder="owner / org"
                                required
                                className="w-full p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono text-xs focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Repository Name</label>
                              <input
                                type="text"
                                value={connectRepoName}
                                onChange={(e) => setConnectRepoName(e.target.value)}
                                placeholder="repo-name"
                                required
                                className="w-full p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono text-xs focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={isConnecting}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all"
                              >
                                {isConnecting ? '…' : 'Connect'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConnectingInstId(null)}
                                className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-lg transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Repos Grid with detailed config */}
                      {instRepos.length > 0 ? (
                        <div className="space-y-2">
                          {instRepos.map((repo) => {
                            const config = repoConfigMap[repo.id];
                            const isExpanded = expandedRepoId === repo.id;
                            const isLoadingConfig = loadingConfigId === repo.id;

                            return (
                              <div
                                key={repo.id}
                                className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden"
                              >
                                {/* Repo header row */}
                                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`w-2 h-2 rounded-full shrink-0 ${
                                        repo.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                                      }`}
                                    />
                                    <div>
                                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm block">
                                        {repo.name}
                                      </span>
                                      <span className="text-[10px] text-zinc-400">
                                        Branch: <span className="font-mono">{repo.defaultBranch}</span>
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        repo.isActive
                                          ? 'bg-emerald-500/10 text-emerald-600'
                                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                      }`}
                                    >
                                      {repo.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <Link
                                      href={`/repositories/${repo.id}`}
                                      className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                                    >
                                      Details →
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleRepoExpand(repo.id)}
                                      className="px-2.5 py-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                                    >
                                      {isExpanded ? '▲ Hide Config' : '▼ View Config'}
                                    </button>
                                  </div>
                                </div>

                                {/* Expanded Config Details */}
                                {isExpanded && (
                                  <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 text-xs animate-fade-in">
                                    {isLoadingConfig ? (
                                      <div className="flex items-center gap-2 text-zinc-400">
                                        <span className="w-4 h-4 rounded-full border-2 border-zinc-200 border-t-indigo-500 animate-spin" />
                                        Loading full config…
                                      </div>
                                    ) : config ? (
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
                                        {[
                                          { label: 'Branch Strategy', value: config.branchStrategy },
                                          { label: 'Doc Branch', value: config.documentationBranchName || '—' },
                                          { label: 'Doc Directory', value: config.documentationDirectory },
                                          { label: 'Visibility', value: config.visibility },
                                          { label: 'Webhook ID', value: config.webhookId ? `#${config.webhookId}` : 'None' },
                                          {
                                            label: 'Webhook Active',
                                            value: config.isWebhookActive ? '✓ Yes' : '✗ No',
                                          },
                                          { label: 'Language', value: config.language || '—' },
                                          {
                                            label: 'Last Synced',
                                            value: config.lastSyncedAt
                                              ? new Date(config.lastSyncedAt).toLocaleDateString()
                                              : 'Never',
                                          },
                                          { label: 'Doc Paths', value: config.docPaths?.length > 0 ? config.docPaths.join(', ') : '(all)' },
                                        ].map(({ label, value }) => (
                                          <div key={label} className="space-y-0.5">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                              {label}
                                            </span>
                                            <span className="font-mono text-zinc-700 dark:text-zinc-300 break-all">
                                              {value}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-zinc-400 italic">Could not load config.</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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

          {/* Per-installation stats */}
          <SectionCard title="Installation Summary" description="Repo counts per GitHub installation.">
            {!hasInstallations ? (
              <p className="text-xs text-zinc-400 italic">No installations.</p>
            ) : (
              <div className="space-y-3 text-xs">
                {installations.map((inst) => {
                  const total = repositoriesRaw?.filter((r) => r.fullName.startsWith(`${inst.accountLogin}/`)).length || 0;
                  const active = repositoriesRaw?.filter((r) => r.fullName.startsWith(`${inst.accountLogin}/`) && r.isActive).length || 0;

                  return (
                    <div key={inst.id} className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2">
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">{inst.accountLogin}</div>
                      <div className="flex gap-4">
                        <div className="text-center">
                          <div className="font-black text-lg text-zinc-900 dark:text-zinc-100">{total}</div>
                          <div className="text-zinc-400 text-[10px]">Total</div>
                        </div>
                        <div className="text-center">
                          <div className="font-black text-lg text-emerald-600">{active}</div>
                          <div className="text-zinc-400 text-[10px]">Active</div>
                        </div>
                        <div className="text-center">
                          <div className="font-black text-lg text-zinc-400">{total - active}</div>
                          <div className="text-zinc-400 text-[10px]">Inactive</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
