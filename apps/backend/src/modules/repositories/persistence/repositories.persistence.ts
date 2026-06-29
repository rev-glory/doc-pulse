import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database';
import type { Repository, Prisma, BranchStrategy } from '@/generated/prisma/client';
import type { IRepositoriesRepository, SyncUpsertRepositoryData } from '../interfaces/repositories.interfaces';

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
    branchStrategy?: BranchStrategy;
    documentationBranchName?: string | null;
    documentationDirectory?: string;
  }): Promise<Repository> {
    return this.prisma.repository.create({
      data,
    });
  }

  /**
   * Upsert a repository record during an installation sync.
   *
   * Uses `githubRepositoryId` as the stable unique key.
   *
   * CREATE: inserts with all fields, isActive = true, lastSyncedAt = now.
   * UPDATE: refreshes only GitHub-sourced metadata. User-controlled fields
   *         (docPaths, webhookId, isWebhookActive) are intentionally preserved.
   *
   * Accepts an optional Prisma transaction client so the caller can batch
   * multiple upserts into a single atomic operation.
   */
  async syncUpsert(
    data: SyncUpsertRepositoryData,
    tx?: Prisma.TransactionClient,
  ): Promise<Repository> {
    const client = tx ?? this.prisma;
    const now = new Date();

    return client.repository.upsert({
      where: { githubRepositoryId: data.githubRepositoryId },
      create: {
        githubRepositoryId: data.githubRepositoryId,
        installationId: data.installationId,
        repositoryOwner: data.repositoryOwner,
        name: data.name,
        fullName: data.fullName,
        defaultBranch: data.defaultBranch,
        private: data.private,
        description: data.description,
        language: data.language,
        cloneUrl: data.cloneUrl,
        htmlUrl: data.htmlUrl,
        visibility: data.visibility,
        isActive: true,
        ownerId: data.ownerId,
        lastSyncedAt: now,
        branchStrategy: 'DOCUMENTATION_BRANCH',
        documentationBranchName: 'docpulse/docs',
        documentationDirectory: 'docs',
      },
      update: {
        // Refresh all GitHub-sourced metadata that can change over time.
        installationId: data.installationId,
        isActive: true,
        repositoryOwner: data.repositoryOwner,
        name: data.name,
        fullName: data.fullName,
        defaultBranch: data.defaultBranch,
        private: data.private,
        description: data.description,
        language: data.language,
        cloneUrl: data.cloneUrl,
        htmlUrl: data.htmlUrl,
        visibility: data.visibility,
        lastSyncedAt: now,
        // Intentionally NOT updated: docPaths, webhookId, isWebhookActive
        // These are user-controlled or managed by separate workflows.
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      isActive: boolean;
      docPaths: string[];
      branchStrategy: BranchStrategy;
      documentationBranchName: string | null;
      documentationDirectory: string;
    }>,
  ): Promise<Repository> {
    return this.prisma.repository.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Repository> {
    return this.prisma.repository.update({
      where: { id },
      data: { isActive: false },
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
      where: {
        ownerId,
        isActive: true,
        installation: { isActive: true },
      },
    });
  }
}
