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

export interface CriticReview {
  score: number;
  passed: boolean;
  issues: string[];
  suggestions: string[];
}

export interface PullRequestSummary {
  url: string;
  number: number;
}

export interface WorkflowState {
  repository: RepositorySummary;
  documentation: DocumentationInventory;
  generatedDocuments?: GeneratedDocument[];
  criticReview?: CriticReview;
  pullRequest?: PullRequestSummary;
  executionStatus?: WorkflowStatus;
  generation?: Record<string, unknown>;
  review?: Record<string, unknown>;
}
