import { RepositorySummary } from '../repository';
import { DocumentationInventory } from '../documentation';
import { WorkflowStatus } from './enums';

export enum GeneratedDocumentType {
  README = 'README',
  INSTALLATION = 'INSTALLATION',
  ARCHITECTURE = 'ARCHITECTURE',
}

export interface GeneratedDocument {
  id: string;
  title: string;
  path: string;
  content: string;
  type: GeneratedDocumentType;
}

export interface CriticReviewSummary {
  approved: boolean;
  comments: string[];
}

export interface PullRequestSummary {
  url: string;
  number: number;
}

export interface WorkflowState {
  repository: RepositorySummary;
  documentation: DocumentationInventory;
  generatedDocuments?: GeneratedDocument[];
  criticReview?: CriticReviewSummary;
  pullRequest?: PullRequestSummary;
  executionStatus?: WorkflowStatus;
  generation?: Record<string, unknown>;
  review?: Record<string, unknown>;
}
