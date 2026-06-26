import { apiClient } from '../client';

export interface InstallationDto {
  id: string;
  installationId: number;
  accountLogin: string;
  accountType: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const GitHubApi = {
  getInstallations: async (): Promise<InstallationDto[]> => {
    return apiClient<InstallationDto[]>('/github/installations');
  },
};
