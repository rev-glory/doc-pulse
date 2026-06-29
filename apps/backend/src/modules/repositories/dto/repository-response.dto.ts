import { Expose } from 'class-transformer';

export class RepositoryResponseDto {
  @Expose()
  id!: string;

  @Expose()
  githubRepositoryId!: number;

  @Expose()
  installationId!: string;

  @Expose()
  repositoryOwner!: string;

  @Expose()
  name!: string;

  @Expose()
  fullName!: string;

  @Expose()
  defaultBranch!: string;

  @Expose()
  private!: boolean;

  @Expose()
  description!: string | null;

  @Expose()
  language!: string | null;

  @Expose()
  cloneUrl!: string;

  @Expose()
  htmlUrl!: string;

  @Expose()
  visibility!: string;

  @Expose()
  isActive!: boolean;

  @Expose()
  lastSyncedAt!: Date | null;

  @Expose()
  docPaths!: string[];

  @Expose()
  webhookId!: number | null;

  @Expose()
  isWebhookActive!: boolean;

  @Expose()
  branchStrategy!: string;

  @Expose()
  documentationBranchName!: string | null;

  // Don't expose ownerId to API responses
  // ownerId!: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
