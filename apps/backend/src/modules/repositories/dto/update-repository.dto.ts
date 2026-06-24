import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class UpdateRepositoryDto {
  @IsString()
  @IsOptional()
  defaultBranch?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsString()
  @IsOptional()
  language?: string | null;

  @IsArray()
  @IsOptional()
  docPaths?: string[];
}
