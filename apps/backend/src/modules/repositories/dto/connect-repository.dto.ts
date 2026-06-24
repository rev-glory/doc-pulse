import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class ConnectRepositoryDto {
  @IsUUID()
  @IsNotEmpty()
  installationId!: string;

  @IsString()
  @IsNotEmpty()
  owner!: string;

  @IsString()
  @IsNotEmpty()
  repositoryName!: string;
}
