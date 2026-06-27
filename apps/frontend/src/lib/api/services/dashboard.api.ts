import { apiClient } from '../client';
import type { DashboardStats, DashboardSettings } from '@docpulse/shared-types';

export const DashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    return apiClient<DashboardStats>('/dashboard/stats');
  },

  getSettings: async (): Promise<DashboardSettings> => {
    return apiClient<DashboardSettings>('/dashboard/settings');
  },
};
