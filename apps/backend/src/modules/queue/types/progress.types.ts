import { WorkflowStage } from '../../../domain/workflow';

export interface WorkflowProgressEvent {
  jobId: string;
  runId: string;
  repositoryId: string;
  stage: WorkflowStage | string;
  message: string;
  percentage: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ProgressPublisher {
  publishProgress(event: WorkflowProgressEvent): Promise<void>;
}
