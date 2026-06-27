import React, { useState } from 'react';
import Link from 'next/link';
import { WorkflowStatusBadge } from '@/components/workflow';
import { EmptyState } from '@/components/feedback/empty-state';
import { RepositoryApi } from '@/lib/api/services/repository.api';

export interface RepositoryTableRow {
  id: string;
  name: string;
  repositoryOwner: string;
  defaultBranch: string;
  isActive: boolean;
  status: string;
  latestWorkflow: string;
  lastSyncedAt?: string | null;
}

export interface RepositoryTableProps {
  repositories: RepositoryTableRow[];
  onActionComplete?: () => void;
}

export const RepositoryTable: React.FC<RepositoryTableProps> = ({ repositories, onActionComplete }) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!repositories || repositories.length === 0) {
    return <EmptyState title="No repositories connected" description="Install the DocPulse GitHub App to sync your repositories." />;
  }

  const handleToggleActive = async (id: string, active: boolean) => {
    setLoadingId(id);
    setErrorMsg(null);
    try {
      if (active) {
        await RepositoryApi.deactivateRepository(id);
      } else {
        await RepositoryApi.activateRepository(id);
      }
      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to toggle repository activation.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm('Are you sure you want to disconnect this repository and clear all execution history?');
    if (!ok) return;

    setLoadingId(id);
    setErrorMsg(null);
    try {
      await RepositoryApi.deleteRepository(id);
      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to disconnect repository.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-300 rounded-lg text-xs font-semibold">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="w-full overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 shadow-sm">
        <table className="w-full text-left text-sm divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs uppercase font-semibold tracking-wider text-zinc-500">
            <tr>
              <th scope="col" className="px-6 py-3.5">Repository Name</th>
              <th scope="col" className="px-6 py-3.5">Owner</th>
              <th scope="col" className="px-6 py-3.5">Default Branch</th>
              <th scope="col" className="px-6 py-3.5">Status</th>
              <th scope="col" className="px-6 py-3.5">Latest Workflow</th>
              <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium">
            {repositories.map((repo) => {
              const isActive = repo.isActive;
              const isProcessing = loadingId === repo.id;

              return (
                <tr key={repo.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">
                    <Link href={`/repositories/${repo.id}`} className="hover:text-emerald-600 dark:hover:text-emerald-400">
                      {repo.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{repo.repositoryOwner}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300">
                      {repo.defaultBranch || 'main'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <WorkflowStatusBadge status={repo.latestWorkflow || 'completed'} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3 text-xs">
                      {/* Active/Deactivate toggle */}
                      <button
                        onClick={() => handleToggleActive(repo.id, isActive)}
                        disabled={isProcessing}
                        className={`font-bold hover:underline transition-all ${
                          isActive ? 'text-zinc-500 hover:text-zinc-800' : 'text-indigo-600 hover:text-indigo-800'
                        }`}
                      >
                        {isProcessing ? '...' : isActive ? 'Deactivate' : 'Activate'}
                      </button>

                      {/* Delete DB record action */}
                      <button
                        onClick={() => handleDelete(repo.id)}
                        disabled={isActive || isProcessing}
                        className={`font-bold transition-all ${
                          isActive
                            ? 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed'
                            : 'text-rose-600 hover:text-rose-800 hover:underline'
                        }`}
                        title={isActive ? 'Must deactivate first to disconnect' : 'Delete local record'}
                      >
                        Disconnect
                      </button>

                      <Link
                        href={`/repositories/${repo.id}`}
                        className="font-bold text-emerald-650 hover:text-emerald-800 hover:underline"
                      >
                        Details &rarr;
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
