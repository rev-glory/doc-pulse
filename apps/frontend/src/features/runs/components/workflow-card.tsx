import React from 'react';
import Link from 'next/link';
import type { WorkflowRunSummary } from '@docpulse/shared-types';
import { WorkflowStatusBadge } from '@/components/workflow';

export interface WorkflowCardProps {
  run: WorkflowRunSummary;
}

export const WorkflowCard: React.FC<WorkflowCardProps> = ({ run }) => {
  const durationSec = run.durationMs ? (run.durationMs / 1000).toFixed(1) : null;

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-5 hover:border-emerald-500/50 transition-all flex flex-col justify-between shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/runs/${run.id}`}
            className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            #{run.commitSha?.slice(0, 7) || run.id.slice(0, 7)}
          </Link>
          <span className="text-xs text-zinc-500 ml-2">on {run.branch || 'main'}</span>
        </div>
        <WorkflowStatusBadge status={run.status} />
      </div>

      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-2 line-clamp-1">
        {run.commitMessage || 'Automated documentation update run.'}
      </p>

      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
        <span>Repo: <strong className="text-zinc-700 dark:text-zinc-300">{run.repositoryName}</strong></span>
        <span>Stage: <strong className="text-emerald-600 dark:text-emerald-400">{run.currentStage || 'Completed'}</strong></span>
        {durationSec && <span>{durationSec}s</span>}
      </div>
    </div>
  );
};
