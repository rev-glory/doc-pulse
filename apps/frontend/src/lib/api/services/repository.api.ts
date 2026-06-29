import { apiClient } from "../client";
import type { RepositoryDetail } from "@docpulse/shared-types";

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

/** Full repository config shape returned by the backend */
export interface RepositoryConfig {
  id: string;
  githubRepositoryId: number;
  installationId: string;
  repositoryOwner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
  description: string | null;
  language: string | null;
  cloneUrl: string;
  htmlUrl: string;
  visibility: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  docPaths: string[];
  webhookId: number | null;
  isWebhookActive: boolean;
  branchStrategy: "DOCUMENTATION_BRANCH" | "CURRENT_BRANCH";
  documentationBranchName: string | null;
  documentationDirectory: string;
  createdAt: string;
  updatedAt: string;
}

/** Payload for PATCH /repositories/:id */
export interface UpdateRepositoryDto {
  docPaths?: string[];
  isActive?: boolean;
  branchStrategy?: "DOCUMENTATION_BRANCH" | "CURRENT_BRANCH";
  documentationBranchName?: string | null;
  documentationDirectory?: string;
}

/** Payload for POST /repositories/connect */
export interface ConnectRepositoryDto {
  installationId: string;
  owner: string;
  repositoryName: string;
}

export const RepositoryApi = {
  listRepositories: async (): Promise<RepositorySummaryDto[]> => {
    const repos = await apiClient<any[]>("/repositories");
    return repos.map((r) => ({
      ...r,
      status: r.isActive ? "Active" : "Inactive",
      latestWorkflow: r.lastSyncedAt ? "Completed" : "Pending",
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
      lastSyncedAt: r.lastSyncedAt
        ? new Date(r.lastSyncedAt).toISOString()
        : null,
      status: r.isActive ? "Active" : "Inactive",
      latestRun: null,
      latestPullRequest: null,
      recentRuns: [],
      generatedDocs: [],
      criticScore: 98,
    };
  },

  /** Get the raw full config DTO for a repository (all backend fields) */
  getRepositoryConfig: async (id: string): Promise<RepositoryConfig> => {
    return apiClient<RepositoryConfig>(`/repositories/${id}`);
  },

  /** PATCH /repositories/:id — update documentation strategy / paths */
  updateRepository: async (
    id: string,
    dto: UpdateRepositoryDto,
  ): Promise<RepositoryConfig> => {
    return apiClient<RepositoryConfig>(`/repositories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  /** POST /repositories/connect — manually connect a specific GitHub repo */
  connectRepository: async (
    dto: ConnectRepositoryDto,
  ): Promise<RepositoryConfig> => {
    return apiClient<RepositoryConfig>("/repositories/connect", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  syncInstallationRepositories: async (
    installationId: number,
  ): Promise<SyncSummaryDto> => {
    return apiClient<SyncSummaryDto>(
      `/repositories/installations/${installationId}/sync`,
      { method: "POST" },
    );
  },

  activateRepository: async (id: string): Promise<RepositoryConfig> => {
    return apiClient<RepositoryConfig>(`/repositories/${id}/activate`, {
      method: "PATCH",
    });
  },

  deactivateRepository: async (id: string): Promise<RepositoryConfig> => {
    return apiClient<RepositoryConfig>(`/repositories/${id}/deactivate`, {
      method: "PATCH",
    });
  },

  deleteRepository: async (id: string): Promise<void> => {
    return apiClient<void>(`/repositories/${id}`, { method: "DELETE" });
  },
};
