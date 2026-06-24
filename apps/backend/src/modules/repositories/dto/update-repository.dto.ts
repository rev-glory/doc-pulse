import { IsOptional, IsArray, IsBoolean } from 'class-validator';

export class UpdateRepositoryDto {
  @IsArray()
  @IsOptional()
  docPaths?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
