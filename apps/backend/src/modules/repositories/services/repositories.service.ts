import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { plainToInstance, ClassTransformer } from 'class-transformer';

import { GitHubRepositoryService } from '@/modules/github/services/github-repository.service';
import { InstallationsPersistence } from '@/modules/github/persistence/installations.persistence';
import { PrismaService } from '@/database';
import type { User, Repository } from '@/generated/prisma/client';
import { WorkspaceLifecycleService } from '@/modules/git-operations/services/workspace-lifecycle.service';

import { ConnectRepositoryDto } from '../dto/connect-repository.dto';
import { UpdateRepositoryDto } from '../dto/update-repository.dto';
import { RepositoryResponseDto } from '../dto/repository-response.dto';
import { RepositoriesPersistence } from '../persistence/repositories.persistence';
import { isValidGitBranchName } from '../validators/branch-name.validator';
import { isValidDocumentationDirectory, normalizeDocumentationDirectory } from '../validators/documentation-directory.validator';

@Injectable()
export class RepositoriesService {
  private readonly logger = new Logger(RepositoriesService.name);
  private readonly classTransformer = new ClassTransformer();

  constructor(
    private readonly repositoriesPersistence: RepositoriesPersistence,
    private readonly gitHubRepositoryService: GitHubRepositoryService,
    private readonly installationsPersistence: InstallationsPersistence,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WorkspaceLifecycleService))
    private readonly workspaceLifecycleService: WorkspaceLifecycleService,
  ) {}

  // --- Helper Methods ---

  private async findOwnedRepository(id: string, userId: string): Promise<Repository> {
    const repository = await this.repositoriesPersistence.findById(id);
    if (!repository) {
      throw new NotFoundException('Repository not found');
    }
    this.assertRepositoryOwnership(repository, userId);
    return repository;
  }

  private assertRepositoryOwnership(repository: Repository, userId: string): void {
    if (repository.ownerId !== userId) {
      this.logger.warn(
        `User ${userId} attempted to access repository ${repository.id} which they don't own`,
      );
      throw new ForbiddenException('Not authorized to access this repository');
    }
  }

  private async findOwnedInstallation(installationId: string, userId: string) {
    const installation = await this.prisma.installation.findUnique({
      where: { id: installationId },
    });
    if (!installation) {
      throw new NotFoundException('Installation not found');
    }
    if (installation.userId !== userId) {
      throw new ForbiddenException('Not authorized to use this installation');
    }
    return installation;
  }

  private toResponseDto(repository: Repository): RepositoryResponseDto {
    return plainToInstance(RepositoryResponseDto, repository, {
      excludeExtraneousValues: true,
    });
  }

  // --- Public Methods ---

  async listRepositories(user: User): Promise<RepositoryResponseDto[]> {
    this.logger.log(`Listing repositories for user ${user.id}`);
    const repositories = await this.repositoriesPersistence.listRepositories(user.id);
    return repositories.map((repo) => this.toResponseDto(repo));
  }

  async getRepositoryById(id: string, user: User): Promise<RepositoryResponseDto> {
    this.logger.log(`Getting repository ${id} for user ${user.id}`);
    const repository = await this.findOwnedRepository(id, user.id);
    return this.toResponseDto(repository);
  }

  /**
   * Sync all repositories accessible to a GitHub App installation (internal method).
   *
   * @param installation - The installation record from the database
   * @returns A summary of the sync operation
   */
  private async syncInstallationRepositoriesInternal(
    installation: { id: string; installationId: number; userId: string },
  ): Promise<{
    installationId: number;
    synced: number;
    created: number;
    updated: number;
    removed?: number;
  }> {
    const logCtx = { githubInstallationId: installation.installationId };
    const startedAt = Date.now();

    this.logger.log('Starting repository sync for installation', logCtx);

    let githubRepos: any[] = [];
    try {
      githubRepos = await this.gitHubRepositoryService.listInstallationRepositories(
        installation.installationId,
      );
    } catch (error: any) {
      const status = error?.status;
      if (
        status === 401 ||
        status === 403 ||
        status === 404 ||
        error?.message?.includes('token is invalid') ||
        error?.message?.includes('not found')
      ) {
        this.logger.warn(
          `Installation ${installation.installationId} is revoked or inaccessible on GitHub. Marking installation and repositories inactive.`,
          { error: error?.message || error },
        );
        await this.installationsPersistence.deactivateInstallation(installation.installationId);
        return {
          installationId: installation.installationId,
          synced: 0,
          created: 0,
          updated: 0,
        };
      }
      throw error;
    }

    this.logger.log(
      `Fetched ${githubRepos.length} repositories from GitHub`,
      { ...logCtx, count: githubRepos.length },
    );

    // Query existing database repositories for this installation or matching accessible GitHub IDs
    const githubRepoIds = githubRepos.map((r) => r.githubRepositoryId);
    const dbRepos = await this.prisma.repository.findMany({
      where: {
        OR: [
          { installationId: installation.id },
          ...(githubRepoIds.length > 0 ? [{ githubRepositoryId: { in: githubRepoIds } }] : []),
        ],
      },
      select: { id: true, githubRepositoryId: true, fullName: true, isActive: true },
    });

    const githubIds = new Set(githubRepoIds);
    const dbRepoMap = new Map(dbRepos.map((r) => [r.githubRepositoryId, r]));

    const addedNames: string[] = [];
    const removedNames: string[] = [];
    let createdCount = 0;
    let updatedCount = 0;

    const removedIds: number[] = [];
    for (const dbRepo of dbRepos) {
      if (dbRepo.isActive && !githubIds.has(dbRepo.githubRepositoryId)) {
        removedIds.push(dbRepo.githubRepositoryId);
        removedNames.push(dbRepo.fullName);
      }
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Ensure installation record is active
      await tx.installation.update({
        where: { id: installation.id },
        data: { isActive: true },
      });

      // Deactivate removed repositories
      if (removedIds.length > 0) {
        await tx.repository.updateMany({
          where: { githubRepositoryId: { in: removedIds } },
          data: { isActive: false, lastSyncedAt: now },
        });
      }

      // Upsert accessible repositories
      for (const repo of githubRepos) {
        const existing = dbRepoMap.get(repo.githubRepositoryId);
        if (!existing) {
          addedNames.push(repo.fullName);
          createdCount++;
        } else {
          if (!existing.isActive) {
            addedNames.push(repo.fullName);
          }
          updatedCount++;
        }

        await this.repositoriesPersistence.syncUpsert(
          {
            githubRepositoryId: repo.githubRepositoryId,
            installationId: installation.id,
            repositoryOwner: repo.owner,
            name: repo.name,
            fullName: repo.fullName,
            defaultBranch: repo.defaultBranch,
            private: repo.isPrivate,
            description: repo.description,
            language: repo.language,
            cloneUrl: repo.cloneUrl,
            htmlUrl: repo.htmlUrl,
            visibility: repo.visibility,
            ownerId: installation.userId,
          },
          tx,
        );
      }
    });

    const duration = Date.now() - startedAt;

    // Structured logging as per prompt specifications
    this.logger.log(`Installation ${installation.installationId} reconciliation summary`, {
      installationId: installation.installationId,
      repositoryIds: githubRepos.map((r) => r.githubRepositoryId),
      repositoryNames: githubRepos.map((r) => r.fullName),
      repositoriesAdded: addedNames,
      repositoriesRemoved: removedNames,
      gitHubRepositoriesCount: githubRepos.length,
      databaseRepositoriesCount: dbRepos.length,
      added: createdCount,
      removed: removedIds.length,
      updated: updatedCount,
      duration,
    });

    return {
      installationId: installation.installationId,
      synced: githubRepos.length,
      created: createdCount,
      updated: updatedCount,
      removed: removedIds.length,
    };
  }

  /**
   * Sync all repositories accessible to a GitHub App installation.
   *
   * The caller must own the installation — ownership is verified against
   * the authenticated user before any GitHub API call is made.
   *
   * @param githubInstallationId - GitHub's integer installation ID
   * @param user                 - The authenticated DocPulse user
   * @returns A summary of the sync operation
   */
  async syncInstallationRepositories(
    githubInstallationId: number,
    user: User,
  ): Promise<{
    installationId: number;
    synced: number;
    created: number;
    updated: number;
    removed?: number;
  }> {
    const installation = await this.installationsPersistence.findByInstallationId(
      githubInstallationId,
    );

    if (!installation) {
      throw new NotFoundException(
        `Installation ${githubInstallationId} not found in database. ` +
          'Ensure the installation webhook has been received before syncing.',
      );
    }

    if (installation.userId !== user.id) {
      this.logger.warn(
        `User ${user.id} attempted to sync installation ${githubInstallationId} ` +
          `which belongs to user ${installation.userId}`,
      );
      throw new ForbiddenException('Not authorized to sync this installation');
    }

    return this.syncInstallationRepositoriesInternal(installation);
  }

  /**
   * Sync all repositories accessible to a GitHub App installation (for webhook use).
   *
   * Does not require a User parameter — used by webhook handlers.
   *
   * @param githubInstallationId - GitHub's integer installation ID
   * @returns A summary of the sync operation
   */
  async syncInstallationRepositoriesFromWebhook(
    githubInstallationId: number,
  ): Promise<{
    installationId: number;
    synced: number;
    created: number;
    updated: number;
    removed?: number;
  } | null> {
    const installation = await this.installationsPersistence.findByInstallationId(
      githubInstallationId,
    );

    if (!installation) {
      this.logger.warn(
        `Installation ${githubInstallationId} not found in database — skipping sync`,
      );
      return null;
    }

    return this.syncInstallationRepositoriesInternal(installation);
  }

  /**
   * Deactivate all repositories belonging to a given GitHub installation ID.
   */
  async deactivateInstallationRepositoriesByGithubId(
    githubInstallationId: number,
  ): Promise<void> {
    const installation = await this.installationsPersistence.findByInstallationId(
      githubInstallationId,
    );
    if (installation) {
      const now = new Date();
      await this.prisma.repository.updateMany({
        where: { installationId: installation.id },
        data: { isActive: false, lastSyncedAt: now },
      });
      this.logger.log(
        `Deactivated all repositories for installation ${githubInstallationId}`,
      );
    }
  }

  /**
   * Mark repositories as inactive (soft delete) for a given installation.
   *
   * @param githubRepositoryIds - Array of GitHub repository IDs to mark inactive
   */
  async markRepositoriesInactive(
    githubRepositoryIds: number[],
  ): Promise<void> {
    if (githubRepositoryIds.length === 0) {
      return;
    }

    const now = new Date();
    await this.prisma.repository.updateMany({
      where: { githubRepositoryId: { in: githubRepositoryIds } },
      data: { isActive: false, lastSyncedAt: now },
    });

    this.logger.log(
      `Marked ${githubRepositoryIds.length} repositories as inactive`,
      { githubRepositoryIds },
    );
  }

  async connectRepository(
    connectRepositoryDto: ConnectRepositoryDto,
    user: User,
  ): Promise<RepositoryResponseDto> {
    const { installationId, owner, repositoryName } = connectRepositoryDto;
    const logContext = { userId: user.id, installationId, owner, repositoryName };

    this.logger.log('Connecting repository', logContext);

    const installation = await this.findOwnedInstallation(installationId, user.id);

    // Fetch metadata from GitHub using an Installation Access Token.
    // GitHubRepositoryService handles 404/403 and throws the appropriate
    // NestJS exceptions — no error mapping needed here.
    const repoMetadata = await this.gitHubRepositoryService.fetchRepositoryMetadata(
      installation.installationId,
      owner,
      repositoryName,
    );

    // Check if repository already connected
    const existingRepository = await this.repositoriesPersistence.findByGithubRepositoryId(
      repoMetadata.githubRepositoryId,
    );
    if (existingRepository) {
      this.logger.warn('Repository already connected', logContext);
      throw new ConflictException('Repository already connected');
    }

    // Persist the repository using the typed metadata.
    const newRepository = await this.repositoriesPersistence.create({
      githubRepositoryId: repoMetadata.githubRepositoryId,
      installationId,
      repositoryOwner: repoMetadata.owner,
      name: repoMetadata.name,
      fullName: repoMetadata.fullName,
      defaultBranch: repoMetadata.defaultBranch,
      private: repoMetadata.isPrivate,
      description: repoMetadata.description,
      language: repoMetadata.language,
      cloneUrl: repoMetadata.cloneUrl,
      htmlUrl: repoMetadata.htmlUrl,
      visibility: repoMetadata.visibility,
      isActive: true,
      ownerId: user.id,
      branchStrategy: 'DOCUMENTATION_BRANCH',
      documentationBranchName: 'docpulse/docs',
      documentationDirectory: 'docs',
    });

    this.logger.log(
      `Repository connected: ${repoMetadata.fullName} (ID: ${newRepository.id})`,
      logContext,
    );

    return this.toResponseDto(newRepository);
  }

  async updateRepository(
    id: string,
    updateRepositoryDto: UpdateRepositoryDto,
    user: User,
  ): Promise<RepositoryResponseDto> {
    this.logger.log(`Updating repository ${id} for user ${user.id}`);
    const repository = await this.findOwnedRepository(id, user.id);

    // Reconcile strategy and documentation branch name for validation
    const strategy = updateRepositoryDto.branchStrategy ?? repository.branchStrategy;
    let branchName = repository.documentationBranchName;
    if (updateRepositoryDto.documentationBranchName !== undefined) {
      branchName = updateRepositoryDto.documentationBranchName;
    }

    if (strategy === 'DOCUMENTATION_BRANCH') {
      if (!branchName || branchName.trim() === '') {
        throw new BadRequestException('documentationBranchName is required when using DOCUMENTATION_BRANCH strategy.');
      }
      if (!isValidGitBranchName(branchName)) {
        throw new BadRequestException('Invalid documentation branch name.');
      }
    } else if (strategy === 'CURRENT_BRANCH') {
      // Keep data model clean by setting configuration branch to null
      updateRepositoryDto.documentationBranchName = null;
    }

    // Reconcile, validate, and normalize documentationDirectory
    const rawDir = updateRepositoryDto.documentationDirectory !== undefined
      ? updateRepositoryDto.documentationDirectory
      : repository.documentationDirectory;

    if (!isValidDocumentationDirectory(rawDir)) {
      throw new BadRequestException('Invalid documentation directory path.');
    }

    const normalizedDir = normalizeDocumentationDirectory(rawDir);
    updateRepositoryDto.documentationDirectory = normalizedDir;

    const updatedRepository = await this.repositoriesPersistence.update(id, updateRepositoryDto);

    this.logger.log(`Repository updated: ${updatedRepository.fullName} (ID: ${updatedRepository.id})`);

    return this.toResponseDto(updatedRepository);
  }

  async activateRepository(id: string, user: User): Promise<RepositoryResponseDto> {
    this.logger.log(`Activating repository ${id} for user ${user.id}`);
    const repository = await this.findOwnedRepository(id, user.id);
    const updatedRepository = await this.repositoriesPersistence.update(id, {
      isActive: true,
    });

    this.logger.log(`Repository activated: ${updatedRepository.fullName} (ID: ${updatedRepository.id})`);

    return this.toResponseDto(updatedRepository);
  }

  async deactivateRepository(id: string, user: User): Promise<RepositoryResponseDto> {
    this.logger.log(`Deactivating repository ${id} for user ${user.id}`);
    const repository = await this.findOwnedRepository(id, user.id);
    const updatedRepository = await this.repositoriesPersistence.update(id, {
      isActive: false,
    });

    this.logger.log(`Repository deactivated: ${updatedRepository.fullName} (ID: ${updatedRepository.id})`);

    return this.toResponseDto(updatedRepository);
  }

  async deleteRepository(id: string, user: User): Promise<void> {
    this.logger.log(`Deleting repository ${id} for user ${user.id}`);
    const repository = await this.findOwnedRepository(id, user.id);

    await this.repositoriesPersistence.delete(id);

    try {
      await this.workspaceLifecycleService.deleteWorkspace(id);
    } catch (error) {
      this.logger.error(`Failed to clean up workspace for deleted repository ${id}:`, error);
    }

    this.logger.log(`Repository deleted: ${repository.fullName} (ID: ${repository.id})`);
  }

  async removeRepository(repositoryId: string): Promise<void> {
    this.logger.log(`Hard deleting repository: ${repositoryId}`);
    await this.repositoriesPersistence.hardDelete(repositoryId);
    this.logger.log(`Repository removed from database: ${repositoryId}`);
  }
}
