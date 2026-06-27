import { RepositorySummary } from '../repository/repository-summary';

/**
 * Canonical shared enum representing LangGraph documentation graph nodes.
 * Used across orchestration, graph compilation, checkpoint snapshots, and retry tracking.
 */
export enum WorkflowNodeName {
  RepositoryAnalyzer = 'RepositoryAnalyzer',
  DocumentationLocator = 'DocumentationLocator',
  TechnicalWriter = 'TechnicalWriter',
  DocumentationCritic = 'DocumentationCritic',
  HumanReview = 'HumanReview',
  GitCommit = 'GitCommit',
  PushBranch = 'PushBranch',
  CreatePullRequest = 'CreatePullRequest',
}

/**
 * Execution progress stages indicating where the workflow is actively executing.
 * Strictly decoupled from overall run lifecycle status (RunStatus).
 */
export enum WorkflowStage {
  CLONING = 'CLONING',
  ANALYZING = 'ANALYZING',
  LOCATING_DOCUMENTATION = 'LOCATING_DOCUMENTATION',
  WRITING = 'WRITING',
  REVIEWING = 'REVIEWING',
  COMMITTING = 'COMMITTING',
  PUSHING = 'PUSHING',
  CREATING_PULL_REQUEST = 'CREATING_PULL_REQUEST',
  FINISHED = 'FINISHED',
}

/**
 * Lightweight reference pointer for generated documents stored in checkpoint state.
 * Excludes heavy markdown text body to keep snapshots compact.
 */
export interface GeneratedDocumentReference {
  id: string;
  title: string;
  path: string;
  type: string;
}

/**
 * Lightweight reference pointer for critic reviews stored in checkpoint state.
 */
export interface CriticReviewReference {
  score: number;
  passed: boolean;
  issueCount: number;
  suggestionCount: number;
}

/**
 * Canonical strongly typed checkpoint snapshot model persisted as JSON in PostgreSQL.
 * Houses lightweight references and append-only execution metadata required for recovery.
 */
export interface WorkflowCheckpointSnapshot {
  workflowRunId: string;
  repositoryId: string;
  workspacePath: string;
  currentNode?: WorkflowNodeName;
  completedNodes: WorkflowNodeName[];
  analysisReference?: RepositorySummary;
  documentationInventoryReference?: Record<string, unknown>;
  generatedDocumentReferences?: GeneratedDocumentReference[];
  criticReviewReference?: CriticReviewReference;
  pullRequestReference?: { url: string; number: number };
  executionMetadata: Record<string, unknown>;
  lastUpdatedTimestamp: string;
}
