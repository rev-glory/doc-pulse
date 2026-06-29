import { IsOptional, IsArray, IsBoolean, IsEnum, IsString } from 'class-validator';
import { BranchStrategy } from '@/generated/prisma/client';
import { IsGitBranchName } from '../validators/branch-name.validator';
import { IsDocumentationDirectory } from '../validators/documentation-directory.validator';

export class UpdateRepositoryDto {
  @IsArray()
  @IsOptional()
  docPaths?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(BranchStrategy)
  branchStrategy?: BranchStrategy;

  @IsOptional()
  @IsString()
  @IsGitBranchName()
  documentationBranchName?: string | null;

  @IsOptional()
  @IsString()
  @IsDocumentationDirectory()
  documentationDirectory?: string;
}
