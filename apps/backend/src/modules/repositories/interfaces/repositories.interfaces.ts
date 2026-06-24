import type { Repository } from '@/generated/prisma/client';

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
  }): Promise<Repository>;

  update(
    id: string,
    data: Partial<{
      defaultBranch: string;
      description: string | null;
      language: string | null;
      isActive: boolean;
      docPaths: string[];
    }>,
  ): Promise<Repository>;

  delete(id: string): Promise<Repository>;

  findById(id: string): Promise<Repository | null>;

  findByGithubRepositoryId(githubRepositoryId: number): Promise<Repository | null>;

  listRepositories(ownerId: string): Promise<Repository[]>;
}
