import { apiClient } from '../client';
import type { RepositoryDetail } from '@docpulse/shared-types';

export interface RepositorySummaryDto {
  id: string;
  name: string;
  fullName: string;
  repositoryOwner: string;
  defaultBranch: string;
  private: boolean;
  description: string | null;
  language: string | null;
  htmlUrl: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  status: string;
  latestWorkflow: string;
}

export interface SyncSummaryDto {
  installationId: number;
  synced: number;
  created: number;
  updated: number;
}

export const RepositoryApi = {
  listRepositories: async (): Promise<RepositorySummaryDto[]> => {
    const repos = await apiClient<any[]>('/repositories');
    return repos.map((r) => ({
      ...r,
      status: r.isActive ? 'Active' : 'Inactive',
      latestWorkflow: r.lastSyncedAt ? 'Completed' : 'Pending',
    }));
  },

  getRepositoryById: async (id: string): Promise<RepositoryDetail> => {
    const r = await apiClient<any>(`/repositories/${id}`);
    return {
      id: r.id,
      githubRepositoryId: r.githubRepositoryId,
      name: r.name,
      fullName: r.fullName,
      owner: r.repositoryOwner,
      defaultBranch: r.defaultBranch,
      isPrivate: r.private,
      description: r.description,
      language: r.language,
      htmlUrl: r.htmlUrl,
      isActive: r.isActive,
      lastSyncedAt: r.lastSyncedAt ? new Date(r.lastSyncedAt).toISOString() : null,
      status: r.isActive ? 'Active' : 'Inactive',
      latestRun: null,
      latestPullRequest: null,
      recentRuns: [],
      generatedDocs: [],
      criticScore: 98,
    };
  },

  syncInstallationRepositories: async (
    installationId: number,
  ): Promise<SyncSummaryDto> => {
    return apiClient<SyncSummaryDto>(
      `/repositories/installations/${installationId}/sync`,
      { method: 'POST' },
    );
  },
};
