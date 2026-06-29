import type { Repository, BranchStrategy } from "@/generated/prisma/client";

export interface SyncUpsertRepositoryData {
  githubRepositoryId: number;
  /** DocPulse Installation UUID (not the GitHub integer ID). */
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
  ownerId: string;
}

export interface IRepositoriesRepository {
  create(data: {
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
    ownerId: string;
    branchStrategy?: BranchStrategy;
    documentationBranchName?: string | null;
    documentationDirectory?: string;
  }): Promise<Repository>;

  syncUpsert(data: SyncUpsertRepositoryData, tx?: unknown): Promise<Repository>;

  update(
    id: string,
    data: Partial<{
      isActive: boolean;
      docPaths: string[];
      branchStrategy: BranchStrategy;
      documentationBranchName: string | null;
      documentationDirectory: string;
    }>,
  ): Promise<Repository>;

  delete(id: string): Promise<Repository>;

  findById(id: string): Promise<Repository | null>;

  findByGithubRepositoryId(
    githubRepositoryId: number,
  ): Promise<Repository | null>;

  listRepositories(ownerId: string): Promise<Repository[]>;
}
