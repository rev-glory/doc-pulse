'use client';

import React from 'react';
import { useApiQuery } from '@/lib/query/use-api-query';
import { RepositoryApi } from '@/lib/api/services/repository.api';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { RepositoryTable } from '@/features/repositories/components/repository-table';

export default function RepositoriesListPage(): React.JSX.Element {
  const { data, isLoading, error, refetch } = useApiQuery({
    queryKey: ['repositories', 'list'],
    queryFn: RepositoryApi.listRepositories,
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Connected Repositories"
        description="GitHub installations monitored by DocPulse for automated documentation generation."
        actions={
          <button
            type="button"
            onClick={refetch}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md shadow transition-all"
          >
            + Sync Installations
          </button>
        }
      />

      {isLoading ? (
        <LoadingState message="Fetching connected GitHub repositories..." rows={6} />
      ) : error ? (
        <ErrorState message={error.message} retry={refetch} />
      ) : (
        <SectionCard title="Installed Repositories">
          <RepositoryTable repositories={data || []} />
        </SectionCard>
      )}
    </div>
  );
}
