import { Expose } from "class-transformer";

export class InstallationResponseDto {
  @Expose()
  id!: string;

  @Expose()
  installationId!: number;

  @Expose()
  accountLogin!: string;

  @Expose()
  accountType!: string;

  @Expose()
  isActive!: boolean;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
