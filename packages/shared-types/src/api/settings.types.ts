export interface GeneralSettings {
  theme: string;
  defaultBranch: string;
}

export interface ModelSettings {
  activeModel: string;
  temperature: number;
}

export interface WorkflowSettings {
  triggerEvent: string;
  webhookUrl: string;
  appId: string;
}

export interface PerformanceSettings {
  concurrencyLimit: number;
  retryLimit: number;
}

export interface DashboardSettings {
  general: GeneralSettings;
  models: ModelSettings;
  workflow: WorkflowSettings;
  performance: PerformanceSettings;
}
