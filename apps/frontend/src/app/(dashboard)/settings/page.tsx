'use client';

import React from 'react';
import { useApiQuery } from '@/lib/query/use-api-query';
import { DashboardApi } from '@/lib/api/services/dashboard.api';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';

export default function SystemSettingsPage(): React.JSX.Element {
  const { data, isLoading, error, refetch } = useApiQuery({
    queryKey: ['dashboard', 'settings'],
    queryFn: DashboardApi.getSettings,
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="System Settings" />
        <LoadingState message="Loading backend configuration parameters..." rows={5} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="System Settings" />
        <ErrorState message={error?.message || 'Failed to retrieve settings.'} retry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="System Settings"
        description="Global AI documentation pipeline active configuration environment settings."
      />

      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 p-4 rounded-xl text-xs leading-relaxed max-w-3xl">
        💡 <strong>Operational Context:</strong> These configurations represent the active settings resolved from backend environment variables and static configuration modules. They are currently <strong>read-only</strong>. Changing these values requires redeploying the backend worker containers with revised environment properties.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
        {/* General Settings */}
        <SectionCard title="General Workspace" description="Defaults for user session and interface.">
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center py-2.5 border-b border-zinc-150 dark:border-zinc-800">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">Application Mode</span>
              <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300 font-bold">
                DEVELOPMENT
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-zinc-150 dark:border-zinc-800">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">Default Branch fallback</span>
              <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                {data.general.defaultBranch}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">Theme</span>
              <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300 capitalize">
                {data.general.theme}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Model Configurations */}
        <SectionCard title="AI Models" description="Google Gemini model configuration.">
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center py-2.5 border-b border-zinc-150 dark:border-zinc-800">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">Active Model</span>
              <span className="font-mono bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded font-bold">
                {data.models.activeModel}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-zinc-150 dark:border-zinc-800">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">Model Temperature</span>
              <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                {data.models.temperature}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">Context Window</span>
              <span className="font-mono text-zinc-400">
                Auto-managed (dynamic token pruning active)
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Workflow Configuration */}
        <SectionCard title="Orchestration Workflow" description="LangGraph pipeline trigger points.">
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center py-2.5 border-b border-zinc-150 dark:border-zinc-800">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">Trigger Event</span>
              <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300 uppercase font-bold">
                {data.workflow.triggerEvent}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-zinc-150 dark:border-zinc-800">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">GitHub App ID</span>
              <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                {data.workflow.appId}
              </span>
            </div>
            <div className="py-2.5">
              <span className="block font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Webhook Target URL</span>
              <span className="block font-mono bg-zinc-550 dark:bg-zinc-950 p-2.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 break-all select-all">
                {data.workflow.webhookUrl}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Performance Settings */}
        <SectionCard title="Resource & Performance" description="Background consumer limits.">
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center py-2.5 border-b border-zinc-150 dark:border-zinc-800">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">BullMQ Concurrency Bound</span>
              <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300 font-bold">
                {data.performance.concurrencyLimit} active jobs
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-zinc-150 dark:border-zinc-800">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">Node Max Retries</span>
              <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300 font-bold">
                {data.performance.retryLimit} attempts
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">Timeout Policy</span>
              <span className="font-mono text-zinc-400">
                10 minutes (per graph execution step)
              </span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
