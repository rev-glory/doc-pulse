import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database';
import type { Repository } from '@/generated/prisma/client';
import type { IRepositoriesRepository } from '../interfaces/repositories.interfaces';

@Injectable()
export class RepositoriesPersistence implements IRepositoriesRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: {
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
  }): Promise<Repository> {
    return this.prisma.repository.create({
      data,
    });
  }

  async update(
    id: string,
    data: Partial<{
      defaultBranch: string;
      description: string | null;
      language: string | null;
      isActive: boolean;
      docPaths: string[];
    }>,
  ): Promise<Repository> {
    return this.prisma.repository.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Repository> {
    return this.prisma.repository.delete({
      where: { id },
    });
  }

  async findById(id: string): Promise<Repository | null> {
    return this.prisma.repository.findUnique({
      where: { id },
    });
  }

  async findByGithubRepositoryId(githubRepositoryId: number): Promise<Repository | null> {
    return this.prisma.repository.findUnique({
      where: { githubRepositoryId },
    });
  }

  async listRepositories(ownerId: string): Promise<Repository[]> {
    return this.prisma.repository.findMany({
      where: { ownerId },
    });
  }
}
