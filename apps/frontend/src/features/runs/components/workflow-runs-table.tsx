import React from "react";
import Link from "next/link";
import type { WorkflowRunSummary } from "@docpulse/shared-types";
import { WorkflowStatusBadge } from "@/components/workflow";
import { EmptyState } from "@/components/feedback/empty-state";

export interface WorkflowRunsTableProps {
  runs: WorkflowRunSummary[];
}

export const WorkflowRunsTable: React.FC<WorkflowRunsTableProps> = ({
  runs,
}) => {
  if (!runs || runs.length === 0) {
    return (
      <EmptyState
        title="No workflow runs found"
        description="Trigger a workflow or push a commit to generate documentation."
      />
    );
  }

  return (
    <div className="w-full overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 shadow-sm">
      <table className="w-full text-left text-sm divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs uppercase font-semibold tracking-wider text-zinc-500">
          <tr>
            <th scope="col" className="px-6 py-3.5">
              Run ID
            </th>
            <th scope="col" className="px-6 py-3.5">
              Repository
            </th>
            <th scope="col" className="px-6 py-3.5">
              Commit
            </th>
            <th scope="col" className="px-6 py-3.5">
              Current Stage
            </th>
            <th scope="col" className="px-6 py-3.5">
              Progress
            </th>
            <th scope="col" className="px-6 py-3.5">
              Status
            </th>
            <th scope="col" className="px-6 py-3.5 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium">
          {runs.map((run) => {
            const progressVal = Math.max(
              0,
              Math.min(100, Math.round(run.progress || 0)),
            );
            return (
              <tr
                key={run.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <td className="px-6 py-4 font-mono text-xs text-zinc-900 dark:text-zinc-100 font-bold">
                  <Link
                    href={`/runs/${run.id}`}
                    className="hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    {run.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300 font-semibold">
                  {run.repositoryName}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                  {run.commitSha?.slice(0, 7) || "HEAD"} ({run.branch || "main"}
                  )
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  {run.currentStage || "Completed"}
                </td>
                <td className="px-6 py-4 w-32">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${progressVal}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono">
                      {progressVal}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <WorkflowStatusBadge status={run.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/runs/${run.id}`}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Watch Stream &rarr;
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
