import { apiClient } from '../client';
import type { WorkflowRunSummary } from '@docpulse/shared-types';

export const WorkflowApi = {
  listRuns: async (): Promise<WorkflowRunSummary[]> => {
    return apiClient<WorkflowRunSummary[]>('/runs');
  },

  getRunById: async (id: string): Promise<WorkflowRunSummary> => {
    return apiClient<WorkflowRunSummary>(`/runs/${id}`);
  },
};
