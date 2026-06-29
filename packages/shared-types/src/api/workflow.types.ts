import { RealtimeWorkflowStage } from '../events/workflow-events.js';
import { GeneratedDocument, CriticReview } from './review.types.js';

export enum RunStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  CHECKPOINTED = 'CHECKPOINTED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  WAITING_FOR_REVIEW = 'WAITING_FOR_REVIEW',
}

export interface WorkflowRunSummary {
  id: string;
  correlationId: string;
  commitSha: string;
  branch: string;
  commitMessage: string | null;
  status: RunStatus;
  currentStage: RealtimeWorkflowStage | string | null;
  currentNode: string | null;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  repositoryId: string;
  repositoryName: string;
  repositoryOwner: string;
  errorMessage: string | null;
  generatedDocuments?: GeneratedDocument[];
  criticReview?: CriticReview | null;
  completedNodes?: string[];
  pullRequestUrl?: string;
  gitOperationStatus?: string;
  skipReason?: string;
  completionReason?: string;
}
