"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useApiQuery } from "@/lib/query/use-api-query";
import { PullRequestApi } from "@/lib/api/services/pull-request.api";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { MetricCard } from "@/components/shared/metric-card";
import { LoadingState } from "@/components/feedback/loading-state";
import { ErrorState } from "@/components/feedback/error-state";
import { WorkflowStatusBadge } from "@/components/workflow";

export default function PullRequestDetailsPage(): React.JSX.Element {
  const params = useParams();
  const prId = typeof params?.id === "string" ? params.id : "";

  const { data, isLoading, error, refetch } = useApiQuery({
    queryKey: ["pull-requests", prId],
    queryFn: () => PullRequestApi.getPullRequestById(prId),
    enabled: Boolean(prId),
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Pull Request Details" />
        <LoadingState message="Loading pull request metadata..." rows={6} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Pull Request Details" />
        <ErrorState
          message={error?.message || "Failed to retrieve pull request."}
          retry={refetch}
        />
      </div>
    );
  }

  const isMerged = data.status === "MERGED";

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={`PR #${data.prNumber || "Pending"}: ${data.title}`}
        description={`Repository: ${data.repositoryOwner}/${data.repositoryName}`}
        actions={
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${isMerged ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"}`}
            >
              ● {data.status}
            </span>
            {data.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noreferrer noopener"
                className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold rounded-lg shadow transition-all"
              >
                ↗ View on GitHub
              </a>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <MetricCard
          title="Head Branch"
          value={data.headBranch}
          subtitle="Source branch"
        />
        <MetricCard
          title="Base Branch"
          value={data.baseBranch}
          subtitle="Target destination"
        />
        <MetricCard
          title="Trigger Commit SHA"
          value={data.commitSha.slice(0, 7)}
          subtitle="Revision"
        />
        <MetricCard
          title="Critic Audit Score"
          value={`${data.criticScore}/100`}
          status={data.criticScore >= 85 ? "success" : "danger"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main description info */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Pull Request Summary"
            description="Autonomous sync details compiled by DocPulse."
          >
            <div className="space-y-4">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 font-medium">
                {data.body ||
                  "No summary text provided by the documentation compiler node."}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Sidebar Info & Action */}
        <div className="space-y-6">
          <SectionCard title="SCM & Pipeline Context">
            <div className="space-y-4 text-xs">
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-850">
                <span className="text-zinc-500 font-semibold">
                  Workflow Status
                </span>
                <WorkflowStatusBadge status={data.workflowStatus} />
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-850">
                <span className="text-zinc-500 font-semibold">
                  Created Timestamp
                </span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {new Date(data.createdAt).toLocaleDateString()}{" "}
                  {new Date(data.createdAt).toLocaleTimeString()}
                </span>
              </div>
              {data.mergedAt && (
                <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-850">
                  <span className="text-zinc-500 font-semibold">
                    Merged Timestamp
                  </span>
                  <span className="font-medium text-zinc-750 dark:text-zinc-350">
                    {new Date(data.mergedAt).toLocaleDateString()}{" "}
                    {new Date(data.mergedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}

              <div className="pt-4">
                <Link
                  href={`/runs/${data.workflowRunId}`}
                  className="w-full text-center block px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm hover:shadow transition-all"
                >
                  🚀 View Workflow Execution Details
                </Link>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
