import { apiClient } from '../client';
import type { UserProfile, UserSettings } from '@docpulse/shared-types';

export const UsersApi = {
  getUserProfile: async (): Promise<UserProfile> => {
    return apiClient<UserProfile>('/users/me');
  },

  updateUserProfile: async (dto: { displayName: string | null }): Promise<UserProfile> => {
    return apiClient<UserProfile>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  getUserSettings: async (): Promise<UserSettings> => {
    return apiClient<UserSettings>('/users/settings');
  },

  updateUserSettings: async (dto: Partial<UserSettings>): Promise<UserSettings> => {
    return apiClient<UserSettings>('/users/settings', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },
};
