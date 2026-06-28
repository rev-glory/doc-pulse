import { Annotation } from '@langchain/langgraph';
import { RepositorySummary } from '../../../domain/repository';
import { DocumentationInventory } from '../../../domain/documentation';
import {
  GeneratedDocument,
  CriticReview,
  PullRequestSummary,
  WorkflowStatus,
  GitOperationStatus,
} from '../../../domain/workflow';

export interface WorkflowError {
  node: string;
  message: string;
  stack?: string;
  timestamp: string;
}

export interface WorkflowExecutionInput {
  runId: string;
  repositoryId: string;
  workspacePath: string;
  metadata?: Record<string, unknown>;
}

/**
 * Single Canonical LangGraph state schema.
 * Directly wraps existing domain WorkflowState without duplicating channels.
 */
export const WorkflowGraphAnnotation = Annotation.Root({
  runId: Annotation<string>(),
  repositoryId: Annotation<string>(),
  workspacePath: Annotation<string>(),

  // Canonical domain channels matching existing WorkflowState contract
  repository: Annotation<RepositorySummary | undefined>(),
  documentation: Annotation<DocumentationInventory | undefined>(),
  generatedDocuments: Annotation<GeneratedDocument[] | undefined>(),
  criticReview: Annotation<CriticReview | undefined>(),
  pullRequest: Annotation<PullRequestSummary | undefined>(),
  branchName: Annotation<string | undefined>(),
  commitSha: Annotation<string | undefined>(),
  pullRequestNumber: Annotation<number | undefined>(),
  pullRequestUrl: Annotation<string | undefined>(),
  gitOperationStatus: Annotation<GitOperationStatus | undefined>(),
  executionStatus: Annotation<WorkflowStatus | undefined>(),
  generation: Annotation<Record<string, unknown> | undefined>(),
  review: Annotation<Record<string, unknown> | undefined>(),
  humanReviewStatus: Annotation<string | undefined>(),
  humanReviewFeedback: Annotation<string | undefined>(),
  generationIteration: Annotation<number>({
    reducer: (curr, update) => update ?? curr,
    default: () => 1,
  }),

  // Orchestration lifecycle channels
  currentNode: Annotation<string>(),
  errors: Annotation<WorkflowError[]>({
    reducer: (curr, update) => curr.concat(update),
    default: () => [],
  }),
  metadata: Annotation<Record<string, unknown> | undefined>(),
});

export type WorkflowGraphState = typeof WorkflowGraphAnnotation.State;
export type WorkflowGraphUpdate = typeof WorkflowGraphAnnotation.Update;
