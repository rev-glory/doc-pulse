import type { User } from '@/generated/prisma/client';
import type { UserResponseDto } from '../dto/user-response.dto';
import type { SettingsResponseDto } from '../dto/settings-response.dto';
import type { UserSettings } from '../types/users.types';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  notifications: { email: true },
  ai: { provider: 'openai' },
};

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export class UsersMapper {
  static toUserResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      githubId: user.githubId,
      githubLogin: user.githubLogin,
      displayName: user.displayName,
      email: user.email,
      githubAvatarUrl: user.githubAvatarUrl,
      createdAt: user.createdAt,
    };
  }

  static toSettingsResponseDto(settings: any): SettingsResponseDto {
    const merged = deepMerge(DEFAULT_SETTINGS, settings || {});
    return {
      theme: merged.theme,
      notifications: merged.notifications,
      ai: merged.ai,
    };
  }

  static getDefaultSettings(): UserSettings {
    return DEFAULT_SETTINGS;
  }

  static mergeSettings(existing: any, update: any): any {
    return deepMerge(existing || DEFAULT_SETTINGS, update);
  }
}
