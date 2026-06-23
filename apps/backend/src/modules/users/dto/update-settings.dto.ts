import { IsOptional, IsString, IsEnum, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class NotificationsSettingsDto {
  @IsOptional()
  @IsBoolean()
  email?: boolean;
}

class AiSettingsDto {
  @IsOptional()
  @IsString()
  provider?: 'openai';
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsEnum(['system', 'light', 'dark'])
  theme?: 'system' | 'light' | 'dark';

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationsSettingsDto)
  notifications?: NotificationsSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiSettingsDto)
  ai?: AiSettingsDto;
}
