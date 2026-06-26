import React from 'react';
import Link from 'next/link';
import { WorkflowStatusBadge } from '@/components/workflow';
import { EmptyState } from '@/components/feedback/empty-state';

export interface RepositoryTableRow {
  id: string;
  name: string;
  repositoryOwner: string;
  defaultBranch: string;
  status: string;
  latestWorkflow: string;
  lastSyncedAt?: string | null;
}

export interface RepositoryTableProps {
  repositories: RepositoryTableRow[];
}

export const RepositoryTable: React.FC<RepositoryTableProps> = ({ repositories }) => {
  if (!repositories || repositories.length === 0) {
    return <EmptyState title="No repositories connected" description="Install the DocPulse GitHub App to sync your repositories." />;
  }

  return (
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
          {repositories.map((repo) => (
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
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {repo.status || 'Active'}
                </span>
              </td>
              <td className="px-6 py-4">
                <WorkflowStatusBadge status={repo.latestWorkflow || 'completed'} />
              </td>
              <td className="px-6 py-4 text-right">
                <Link
                  href={`/repositories/${repo.id}`}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  View Details &rarr;
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
