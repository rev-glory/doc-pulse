'use client';

import React from 'react';
import Link from 'next/link';
import { useApiQuery } from '@/lib/query/use-api-query';
import { ReviewsApi } from '@/lib/api/services/reviews.api';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { WorkflowStatusBadge } from '@/components/workflow';

export default function ReviewsListPage(): React.JSX.Element {
  const { data, isLoading, error, refetch } = useApiQuery({
    queryKey: ['reviews', 'list'],
    queryFn: ReviewsApi.listReviews,
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Human Reviews" />
        <LoadingState message="Fetching documentation reviews..." rows={5} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Human Reviews" />
        <ErrorState message={error?.message || 'Failed to load reviews.'} retry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Human Reviews"
        description="Inspect and approve generated documentation files before they are pushed to GitHub."
      />

      <SectionCard title="Active Review Queue" description="Pipeline checkpoints awaiting reviewer decisions.">
        {data.length === 0 ? (
          <EmptyState
            title="No reviews pending"
            description="Documentation runs are either completed or actively executing."
          />
        ) : (
          <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-5 py-4">Repository</th>
                  <th className="px-5 py-4">Branch</th>
                  <th className="px-5 py-4">Commit SHA</th>
                  <th className="px-5 py-4">Created At</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-250 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                {data.map((review) => (
                  <tr key={review.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-all">
                    <td className="px-5 py-4 font-bold text-zinc-900 dark:text-white">
                      {review.repositoryOwner}/{review.repositoryName}
                    </td>
                    <td className="px-5 py-4 font-mono text-zinc-500">{review.branch}</td>
                    <td className="px-5 py-4 font-mono text-zinc-400">{review.commitSha.slice(0, 7)}</td>
                    <td className="px-5 py-4 text-zinc-400">
                      {new Date(review.createdAt).toLocaleDateString()} {new Date(review.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-4">
                      <WorkflowStatusBadge status={review.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/reviews/${review.id}`}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 font-bold transition-all"
                      >
                        Inspect Workspace
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
