import { apiClient } from '../client';
import type { PullRequestSummary } from '@docpulse/shared-types';

export const PullRequestApi = {
  listPullRequests: async (): Promise<PullRequestSummary[]> => {
    return apiClient<PullRequestSummary[]>('/pull-requests');
  },
};
