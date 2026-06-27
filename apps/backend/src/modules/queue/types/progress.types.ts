import { WorkflowStage } from '../../../domain/workflow';
import { QueueEventStatus, RealtimeWorkflowStage } from '@docpulse/shared-types';

export interface WorkflowProgressEvent {
  jobId: string;
  runId: string;
  repositoryId: string;
  stage: WorkflowStage | string;
  message: string;
  percentage: number;
  timestamp: string;
  queueStatus?: QueueEventStatus;
  realtimeStatus?: string;
  realtimeStage?: RealtimeWorkflowStage;
  metadata?: Record<string, unknown>;
}

export interface ProgressPublisher {
  publishProgress(event: WorkflowProgressEvent): Promise<void>;
}
