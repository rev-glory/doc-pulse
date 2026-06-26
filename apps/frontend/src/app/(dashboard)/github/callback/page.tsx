'use client';

import React, { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GitHubApi, InstallationDto } from '@/lib/api/services/github.api';
import { RepositoryApi } from '@/lib/api/services/repository.api';
import { DashboardApi } from '@/lib/api/services/dashboard.api';
import { SyncProgressOverlay, LogLine } from '@/features/repositories/components/sync-progress-overlay';
import { useApiQuery } from '@/lib/query/use-api-query';

function OnboardingCallbackContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const installationIdParam = searchParams.get('installation_id');
  const setupAction = searchParams.get('setup_action');

  const { refetch: refetchDashboard } = useApiQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: DashboardApi.getStats,
    enabled: false,
  });

  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [errorState, setErrorState] = useState<string | null>(null);
  const hasStarted = useRef(false);

  const addLog = (text: string, status: LogLine['status'] = 'pending') => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => {
      // If a log with the exact same text already exists, update its status
      const existingIndex = prev.findIndex((l) => l.text === text);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex]!, status, timestamp };
        return next;
      }
      return [...prev, { id: Math.random().toString(), text, status, timestamp }];
    });
  };

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const startOnboarding = async () => {
      // 1. Initial validation
      if (!installationIdParam || setupAction !== 'install') {
        addLog('Verifying installation query parameters...', 'error');
        setErrorState('Invalid onboarding request. No installation ID or setup action found.');
        return;
      }

      const installationId = parseInt(installationIdParam, 10);
      if (isNaN(installationId)) {
        addLog('Validating integer installation ID...', 'error');
        setErrorState('Invalid GitHub Installation identifier.');
        return;
      }

      // Smooth progress animation helper
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 20) return prev + 1; // slow tick during polling
          if (prev >= 20 && prev < 75) return prev + 1; // slow tick during sync
          if (prev >= 75 && prev < 95) return prev + 0.5; // very slow near end
          return prev;
        });
      }, 150);

      try {
        // Step 1: Webhook Wait Loop
        addLog('Waiting for GitHub webhook verification...', 'running');
        setProgress(5);

        let verifiedInstallation: InstallationDto | undefined;
        let retryCount = 0;
        const maxRetries = 6; // 6 retries * 2s = 12s total wait

        while (retryCount < maxRetries) {
          try {
            const installations = await GitHubApi.getInstallations();
            verifiedInstallation = installations.find((i) => i.installationId === installationId);
            if (verifiedInstallation) {
              break;
            }
          } catch (e) {
            console.warn('Failed to poll installations, retrying...', e);
          }
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        if (!verifiedInstallation) {
          clearInterval(progressInterval);
          addLog('GitHub webhook verification...', 'error');
          setErrorState('Webhook delay timeout. DocPulse has not received the installation webhook from GitHub. Please try again.');
          return;
        }

        addLog('Waiting for GitHub webhook verification...', 'success');
        addLog(`Successfully verified installation: ${verifiedInstallation.accountLogin} (${verifiedInstallation.accountType})`, 'success');
        setProgress(25);

        // Step 2: Fetch Repository list from GitHub & Sync in database
        addLog('Retrieving repository list from GitHub API...', 'running');
        addLog('Upserting repository nodes into DocPulse workspace database...', 'pending');

        // Fast forward progress to 40%
        setProgress(40);

        const syncPromise = RepositoryApi.syncInstallationRepositories(installationId);
        
        // Setup timeout fallback for background handoff
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
        const result = await Promise.race([syncPromise, timeoutPromise]);

        if (result === null) {
          // Timeout occurred -> handoff to background
          clearInterval(progressInterval);
          addLog('Retrieving repository list from GitHub API...', 'success');
          addLog('Upserting repository nodes into DocPulse workspace database...', 'running');
          addLog('Workspace synchronization deferred to background processing...', 'running');
          setProgress(85);
          
          await new Promise((resolve) => setTimeout(resolve, 1500));
          router.push('/repositories?sync=background');
          return;
        }

        // Fast forward progress to 80%
        setProgress(80);
        addLog('Retrieving repository list from GitHub API...', 'success');
        addLog('Upserting repository nodes into DocPulse workspace database...', 'success');
        addLog(`Successfully synced ${result.synced} repositories (${result.created} created, ${result.updated} updated)`, 'success');

        // Step 3: Refresh Dashboard Telemetry
        addLog('Refreshing command center telemetry...', 'running');
        await refetchDashboard();
        addLog('Refreshing command center telemetry...', 'success');

        // Jump to 100%
        clearInterval(progressInterval);
        setProgress(100);
        addLog('Onboarding completed. Welcome to DocPulse!', 'success');

        // Wait 1.5s for satisfaction and redirect
        await new Promise((resolve) => setTimeout(resolve, 1500));
        router.push('/repositories?sync=success');

      } catch (err: any) {
        clearInterval(progressInterval);
        addLog('Synchronizing workspaces...', 'error');
        setErrorState(err?.message || 'Sync failed due to API connectivity limits.');
      }
    };

    startOnboarding();
  }, [installationIdParam, setupAction, router, refetchDashboard]);

  if (errorState) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-center text-zinc-100 animate-fade-in">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-950/50 border border-red-500/30 text-red-500 mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold">Onboarding Synchronization Error</h3>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{errorState}</p>
          
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => {
                hasStarted.current = false;
                setErrorState(null);
                setLogs([]);
                setProgress(0);
                window.location.reload();
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-lg text-sm shadow transition-all cursor-pointer"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/repositories')}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-lg text-sm transition-all cursor-pointer"
            >
              Go to Repositories
            </button>
          </div>
        </div>
      </div>
    );
  }

  const accountLoginName = logs.find(l => l.text.includes('Successfully verified installation'))
    ? logs.find(l => l.text.includes('Successfully verified installation'))!.text.split(': ')[1]?.split(' (')[0]
    : undefined;

  return (
    <SyncProgressOverlay
      accountLogin={accountLoginName}
      logs={logs}
      progress={Math.round(progress)}
      onSkip={() => router.push('/repositories?sync=background')}
    />
  );
}

export default function OnboardingCallbackPage(): React.JSX.Element {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md text-zinc-300 font-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          Initializing OAuth Redirect Security Headers...
        </div>
      </div>
    }>
      <OnboardingCallbackContent />
    </Suspense>
  );
}
