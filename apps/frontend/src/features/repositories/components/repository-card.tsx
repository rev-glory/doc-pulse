import React from "react";
import Link from "next/link";
import { WorkflowStatusBadge } from "@/components/workflow";

export interface RepositoryCardProps {
  id: string;
  name: string;
  owner: string;
  description?: string | null;
  language?: string | null;
  status?: string;
  latestRunStatus?: string;
}

export const RepositoryCard: React.FC<RepositoryCardProps> = ({
  id,
  name,
  owner,
  description,
  language = "TypeScript",
  status = "Active",
  latestRunStatus = "completed",
}) => {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-5 hover:border-emerald-500/50 transition-all flex flex-col justify-between shadow-sm">
      <div>
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/repositories/${id}`}
            className="text-base font-bold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors tracking-tight truncate"
          >
            {owner}/{name}
          </Link>
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
            {status}
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 min-h-[32px]">
          {description || "Automated AI documentation generation active."}
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-zinc-600 dark:text-zinc-400 font-medium">
            {language || "TypeScript"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400">Run:</span>
          <WorkflowStatusBadge status={latestRunStatus} />
        </div>
      </div>
    </div>
  );
};
