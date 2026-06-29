"use client";

import React from "react";
import { useApiQuery } from "@/lib/query/use-api-query";
import { WorkflowApi } from "@/lib/api/services/workflow.api";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { LoadingState } from "@/components/feedback/loading-state";
import { ErrorState } from "@/components/feedback/error-state";
import { WorkflowRunsTable } from "@/features/runs/components/workflow-runs-table";

export default function WorkflowRunsListPage(): React.JSX.Element {
  const { data, isLoading, error, refetch } = useApiQuery({
    queryKey: ["workflow", "runs"],
    queryFn: WorkflowApi.listRuns,
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Workflow Execution History"
        description="Complete telemetry log of autonomous LangGraph AI documentation generation agents."
        actions={
          <button
            type="button"
            onClick={refetch}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold rounded-md shadow transition-all"
          >
            ↻ Refresh Feed
          </button>
        }
      />

      {isLoading ? (
        <LoadingState message="Querying execution logs..." rows={8} />
      ) : error ? (
        <ErrorState message={error.message} retry={refetch} />
      ) : (
        <SectionCard title="All Executions">
          <WorkflowRunsTable runs={data || []} />
        </SectionCard>
      )}
    </div>
  );
}
