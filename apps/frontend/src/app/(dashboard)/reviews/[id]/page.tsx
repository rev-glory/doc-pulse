'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApiQuery } from '@/lib/query/use-api-query';
import { ReviewsApi } from '@/lib/api/services/reviews.api';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { MetricCard } from '@/components/shared/metric-card';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { MarkdownViewer } from '@/features/reviews/components/markdown-viewer';
import { WorkflowStatusBadge } from '@/components/workflow';
import type { GeneratedDocument, CriticIssue } from '@docpulse/shared-types';

export default function ReviewApprovalWorkspacePage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const reviewId = typeof params?.id === 'string' ? params.id : '';

  const { data, isLoading, error, refetch } = useApiQuery({
    queryKey: ['review', reviewId],
    queryFn: () => ReviewsApi.getReviewById(reviewId),
    enabled: Boolean(reviewId),
  });

  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-select first document if list loads
  useEffect(() => {
    if (data?.generatedDocuments && data.generatedDocuments.length > 0) {
      setSelectedDocIndex(0);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Review Workspace" />
        <LoadingState message="Fetching documentation checkpoint snapshot..." rows={6} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Review Workspace" />
        <ErrorState message={error?.message || 'Review not found.'} retry={refetch} />
      </div>
    );
  }

  const generatedDocs = data.generatedDocuments || [];
  const selectedDoc = generatedDocs[selectedDocIndex] as GeneratedDocument | undefined;

  // Filter critic reviews for the selected document
  const documentReview = data.criticReview?.reviews?.find(
    (r) => r.documentType === selectedDoc?.type
  );

  const overallCriticScore = data.criticReview?.score ?? 0;

  const handleDecision = async (approve: boolean) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (approve) {
        await ReviewsApi.approveReview(reviewId, comment);
      } else {
        await ReviewsApi.rejectReview(reviewId, comment);
      }
      // Redirect back to dashboard on success
      router.push('/dashboard');
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit review decision. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={`Review Workspace`}
        description={`Inspect generated documentation. Approved changes will be pushed to the repository.`}
        actions={
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 text-xs font-mono">Run ID: #{data.workflowRunId.slice(0, 8)}</span>
            <WorkflowStatusBadge status={data.status} />
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <MetricCard title="Repository" value={`${data.repositoryOwner}/${data.repositoryName}`} subtitle="Target destination" />
        <MetricCard title="Branch" value={data.branch} subtitle="Commit branch" />
        <MetricCard title="Commit SHA" value={data.commitSha.slice(0, 7)} subtitle="Triggering revision" />
        <MetricCard
          title="Overall Critic Score"
          value={`${overallCriticScore}/100`}
          status={overallCriticScore >= 85 ? 'success' : 'danger'}
        />
      </div>

      {generatedDocs.length === 0 ? (
        <EmptyState title="No generated documents" description="This run contains no generated markdown files to review." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar: Document Picker */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Generated Files</h3>
            <div className="flex flex-col gap-1.5">
              {generatedDocs.map((doc, idx) => {
                const isSelected = idx === selectedDocIndex;
                const docRev = data.criticReview?.reviews?.find((r) => r.documentType === doc.type);
                const score = docRev?.score ?? 90;
                const isApproved = docRev?.approved ?? true;

                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocIndex(idx)}
                    className={`w-full text-left p-3.5 rounded-lg border text-xs font-medium transition-all duration-200 flex justify-between items-center ${
                      isSelected
                        ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900 font-bold shadow-md'
                        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="truncate max-w-[140px]">📄 {doc.path}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isApproved ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                      {score}/100
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center Column: Markdown Viewer */}
          <div className="lg:col-span-2 space-y-6">
            {selectedDoc && (
              <SectionCard
                title={selectedDoc.title}
                description={`Path: ${selectedDoc.path} • Type: ${selectedDoc.type}`}
              >
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 overflow-y-auto max-h-[600px]">
                  <MarkdownViewer markdown={selectedDoc.markdown} />
                </div>
              </SectionCard>
            )}
          </div>

          {/* Right Column: Critic Panel & Review Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Critic Score & Issues */}
            <SectionCard title="Critic Audit" description="AI Critic report and review suggestions.">
              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">File Score</span>
                  <span className={`text-lg font-black ${documentReview && documentReview.score < 85 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {documentReview?.score ?? 90}/100
                  </span>
                </div>

                {documentReview?.issues && documentReview.issues.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Identified Issues</h4>
                    <div className="space-y-2">
                      {documentReview.issues.map((issue: CriticIssue, idx: number) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border text-xs leading-relaxed ${
                            issue.severity === 'CRITICAL'
                              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-300'
                              : issue.severity === 'MAJOR'
                              ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-300'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold mb-1">
                            <span className="uppercase text-[9px] tracking-wide">{issue.severity}</span>
                            <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">{issue.category}</span>
                          </div>
                          <p>{issue.message}</p>
                          {issue.location && (
                            <p className="mt-1 font-mono text-[10px] text-zinc-400">Loc: {issue.location}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border border-zinc-200 dark:border-zinc-800 border-dashed rounded-lg text-center text-zinc-400 text-xs">
                    No critical/major issues found. AI Critic approved.
                  </div>
                )}

                {documentReview?.suggestions && documentReview.suggestions.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">AI Suggestions</h4>
                    <ul className="list-disc pl-4 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                      {documentReview.suggestions.map((s: string, idx: number) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Decision card */}
            <SectionCard title="Review Decision" description="Submit approval or request updates.">
              <div className="space-y-4">
                {submitError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300 rounded text-xs">
                    {submitError}
                  </div>
                )}

                <textarea
                  placeholder="Explain your changes or reasons for approval/rejection..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full min-h-[100px] p-3 text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 text-zinc-800 dark:text-zinc-200 transition-all leading-relaxed"
                  disabled={data.status !== 'PENDING' || isSubmitting}
                />

                {data.status === 'PENDING' ? (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => handleDecision(false)}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : '✕ Reject'}
                    </button>
                    <button
                      onClick={() => handleDecision(true)}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : '✓ Approve'}
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center rounded-lg text-xs font-bold text-zinc-500 uppercase tracking-wide">
                    Review Status: {data.status}
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
