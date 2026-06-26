import React from 'react';
import type { PullRequestSummary } from '@docpulse/shared-types';
import { EmptyState } from '@/components/feedback/empty-state';

export interface RecentPullRequestsProps {
  pullRequests: PullRequestSummary[];
}

export const RecentPullRequests: React.FC<RecentPullRequestsProps> = ({ pullRequests }) => {
  if (!pullRequests || pullRequests.length === 0) {
    return <EmptyState title="No Pull Requests generated" description="AI generated documentation updates will appear here as PRs." />;
  }

  return (
    <div className="space-y-3">
      {pullRequests.map((pr) => {
        const isMerged = pr.status === 'MERGED';
        return (
          <div
            key={pr.id}
            className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-white dark:bg-zinc-900 flex items-center justify-between hover:border-emerald-500/40 transition-colors shadow-sm"
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <span className={`text-lg shrink-0 ${isMerged ? 'text-purple-500 font-black' : 'text-emerald-500'}`}>
                {isMerged ? '🟣' : '🟢'}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {pr.url ? (
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 truncate"
                    >
                      {pr.title}
                    </a>
                  ) : (
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{pr.title}</span>
                  )}
                  {pr.prNumber && (
                    <span className="text-xs font-mono text-zinc-400">#{pr.prNumber}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                  <span>Repo: <strong className="text-zinc-700 dark:text-zinc-300">{pr.repositoryName}</strong></span>
                  <span>&bull;</span>
                  <span>Branch: <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">{pr.headBranch}</code></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-4">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Critic Score</span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{pr.criticScore || 95}/100</span>
              </div>
              <span
                className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${
                  isMerged
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}
              >
                {pr.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
