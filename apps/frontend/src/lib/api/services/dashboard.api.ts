import { apiClient } from '../client';
import type { DashboardStats } from '@docpulse/shared-types';

export const DashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    return apiClient<DashboardStats>('/dashboard/stats');
  },
};
