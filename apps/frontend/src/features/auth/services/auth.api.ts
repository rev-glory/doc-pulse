
import { apiClient } from '@/lib/api/client';
import type { User } from '../types/auth.types';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';

export const AuthApi = {
  async getCurrentUser(): Promise<User> {
    return apiClient<User>('/auth/me', {
      method: 'GET',
      credentials: 'include',
    });
  },

  async logout(): Promise<void> {
    return apiClient<void>('/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  },

  getGithubLoginUrl(): string {
    return `${API_BASE_URL}/auth/github`;
  },
};

