"use client";

import React from "react";
import { useApiQuery } from "@/lib/query/use-api-query";
import { PullRequestApi } from "@/lib/api/services/pull-request.api";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { LoadingState } from "@/components/feedback/loading-state";
import { ErrorState } from "@/components/feedback/error-state";
import { RecentPullRequests } from "@/features/pull-requests/components/recent-pull-requests";

export default function PullRequestsListPage(): React.JSX.Element {
  const { data, isLoading, error, refetch } = useApiQuery({
    queryKey: ["pull-requests", "list"],
    queryFn: PullRequestApi.listPullRequests,
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Generated Pull Requests"
        description="Autonomous AI documentation sync pull requests submitted directly to connected GitHub repositories."
        actions={
          <button
            type="button"
            onClick={refetch}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold rounded-md shadow transition-all"
          >
            ↻ Check GitHub Feed
          </button>
        }
      />

      {isLoading ? (
        <LoadingState message="Querying generated pull requests..." rows={6} />
      ) : error ? (
        <ErrorState message={error.message} retry={refetch} />
      ) : (
        <SectionCard title="All Pull Requests">
          <RecentPullRequests pullRequests={data || []} />
        </SectionCard>
      )}
    </div>
  );
}
