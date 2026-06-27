'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApiQuery } from '@/lib/query/use-api-query';
import { RepositoryApi } from '@/lib/api/services/repository.api';
import { GitHubApi } from '@/lib/api/services/github.api';
import { DashboardApi } from '@/lib/api/services/dashboard.api';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { RepositoryTable } from '@/features/repositories/components/repository-table';
import { EmptyInstallation } from '@/features/repositories/components/empty-installation';

function RepositoriesListContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const syncStatus = searchParams.get('sync');

  const { data: repositories, isLoading: isLoadingRepos, error: reposError, refetch: refetchRepos } = useApiQuery({
    queryKey: ['repositories', 'list'],
    queryFn: RepositoryApi.listRepositories,
  });

  const { data: installations, isLoading: isLoadingInstallations, error: installationsError, refetch: refetchInstallations } = useApiQuery({
    queryKey: ['github', 'installations'],
    queryFn: GitHubApi.getInstallations,
  });

  const { refetch: refetchDashboard } = useApiQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: DashboardApi.getStats,
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [showSyncBanner, setShowSyncBanner] = useState(true);

  useEffect(() => {
    if (syncStatus === 'success') {
      setSyncSuccess('Onboarding completed! Your repositories have been synchronized successfully.');
      // Auto-clear success message after 5 seconds
      const timer = setTimeout(() => setSyncSuccess(null), 5000);
      return () => clearTimeout(timer);
    } else if (syncStatus === 'background') {
      setSyncSuccess('Workspace sync is running in the background. Repositories will appear as they index.');
    }
    return undefined;
  }, [syncStatus]);

  const handleConnectGitHub = () => {
    // Lead user directly to the new installation setup
    window.location.href = 'https://github.com/apps/docpulse-test-app/installations/new';
  };

  const handleSyncRepositories = async () => {
    setSyncError(null);
    setSyncSuccess(null);
    setIsSyncing(true);
    try {
      const installs = installations || [];
      if (installs.length > 0) {
        // Sync the first installation or loop through them
        addSyncBanner('Syncing repositories with GitHub...');
        for (const inst of installs) {
          await RepositoryApi.syncInstallationRepositories(inst.installationId);
        }
        await refetchRepos();
        await refetchDashboard();
        setSyncSuccess('Repositories synchronized successfully.');
      } else {
        setSyncError('No GitHub App installations found. Please connect GitHub first.');
      }
    } catch (e: any) {
      setSyncError(e.message || 'Failed to sync repositories');
    } finally {
      setIsSyncing(false);
      removeSyncBanner();
    }
  };

  const addSyncBanner = (msg: string) => {
    setSyncSuccess(msg);
    setShowSyncBanner(true);
  };

  const removeSyncBanner = () => {
    // If not a background or success redirect query, clear it
    if (syncStatus !== 'background') {
      setSyncSuccess(null);
    }
  };

  const hasInstallations = installations && installations.length > 0;

  if (isLoadingRepos || isLoadingInstallations) {
    return (
      <div className="space-y-8">
        <PageHeader title="Connected Repositories" description="Fetching installation details..." />
        <LoadingState message="Fetching connected GitHub repositories..." rows={6} />
      </div>
    );
  }

  if (reposError || installationsError) {
    return (
      <div className="space-y-8">
        <PageHeader title="Connected Repositories" />
        <ErrorState 
          message={(reposError || installationsError)?.message || 'Failed to retrieve repository status.'} 
          retry={() => { refetchRepos(); refetchInstallations(); }} 
        />
      </div>
    );
  }

  // First Login / Onboarding Empty State (No Installations)
  if (!hasInstallations) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader
          title="Connected Repositories"
          description="Monitored GitHub App installations for automated doc workflows."
        />
        <EmptyInstallation onConnect={handleConnectGitHub} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Connected Repositories"
        description="GitHub installations monitored by DocPulse for automated documentation generation."
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConnectGitHub}
              className="px-3.5 py-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-md transition-all cursor-pointer"
            >
              Configure App Selection
            </button>
            <button
              type="button"
              onClick={handleSyncRepositories}
              disabled={isSyncing}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-md shadow transition-all cursor-pointer"
            >
              {isSyncing ? 'Syncing...' : 'Sync Repositories'}
            </button>
          </div>
        }
      />

      {syncSuccess && showSyncBanner && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-sm text-emerald-800 dark:text-emerald-300">{syncSuccess}</p>
          </div>
          <button 
            onClick={() => setShowSyncBanner(false)}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {syncError && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg animate-fade-in">
          <p className="text-sm text-red-800 dark:text-red-300">{syncError}</p>
        </div>
      )}

      <SectionCard title="Installed Repositories" description="Select which repositories to monitor for documentation changes.">
        <RepositoryTable repositories={repositories || []} onActionComplete={refetchRepos} />
      </SectionCard>
    </div>
  );
}

export default function RepositoriesListPage(): React.JSX.Element {
  return (
    <Suspense fallback={
      <div className="space-y-8">
        <PageHeader title="Connected Repositories" description="Hydrating React views..." />
        <LoadingState message="Fetching connected GitHub repositories..." rows={6} />
      </div>
    }>
      <RepositoriesListContent />
    </Suspense>
  );
}

