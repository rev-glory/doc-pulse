import { RepositorySummary } from '../repository';
import { DocumentationInventory } from '../documentation';
import { GeneratedDocument, CriticReview, PullRequestDraft, WorkflowExecutionStatus } from '../../modules/workflow/types';

export interface WorkflowState {
  runId?: string;
  repositoryId?: string;
  repository: RepositorySummary;
  documentation: DocumentationInventory;
  generatedDocuments?: GeneratedDocument[];
  criticReview?: CriticReview;
  pullRequest?: PullRequestDraft;
  executionStatus: WorkflowExecutionStatus;
  currentNode?: string;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}
