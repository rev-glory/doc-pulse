import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { plainToInstance, ClassTransformer } from 'class-transformer';

import { GitHubRepositoryService } from '@/modules/github/services/github-repository.service';
import { PrismaService } from '@/database';
import type { User, Repository } from '@/generated/prisma/client';

import { ConnectRepositoryDto } from '../dto/connect-repository.dto';
import { UpdateRepositoryDto } from '../dto/update-repository.dto';
import { RepositoryResponseDto } from '../dto/repository-response.dto';
import { RepositoriesPersistence } from '../persistence/repositories.persistence';

@Injectable()
export class RepositoriesService {
  private readonly logger = new Logger(RepositoriesService.name);
  private readonly classTransformer = new ClassTransformer();

  constructor(
    private readonly repositoriesPersistence: RepositoriesPersistence,
    private readonly gitHubRepositoryService: GitHubRepositoryService,
    private readonly prisma: PrismaService,
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

    this.logger.log(`Repository deleted: ${repository.fullName} (ID: ${repository.id})`);
  }
}
