import { RepositorySummary } from '../repository';
import { DocumentationInventory } from '../documentation';
import { WorkflowStatus } from './enums';

export enum GeneratedDocumentType {
  README = 'README',
  INSTALLATION = 'INSTALLATION',
  ARCHITECTURE = 'ARCHITECTURE',
  API = 'API',
  CONTRIBUTING = 'CONTRIBUTING',
  DEPLOYMENT = 'DEPLOYMENT',
}

export interface GeneratedDocumentMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  generationDurationMs: number;
  promptVersion: number;
  model: string;
}

export interface GeneratedDocument {
  id: string;
  title: string;
  path: string;
  markdown: string;
  summary: string;
  content?: string;
  type: GeneratedDocumentType;
  metrics?: GeneratedDocumentMetrics;
}

/**
 * Factory helper creating canonical GeneratedDocument instances.
 * Attaches non-enumerable getter for backward compatibility with 'content'
 * without duplicating markdown state in serialized checkpoint JSON.
 */
export function createGeneratedDocument(data: Omit<GeneratedDocument, 'content'>): GeneratedDocument {
  const doc = { ...data } as GeneratedDocument;
  Object.defineProperty(doc, 'content', {
    get() {
      return (this as GeneratedDocument).markdown;
    },
    enumerable: false,
    configurable: true,
  });
  return doc;
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
  runId?: string;
  repositoryId?: string;
  repository: RepositorySummary;
  documentation: DocumentationInventory;
  generatedDocuments?: GeneratedDocument[];
  criticReview?: CriticReview;
  pullRequest?: PullRequestSummary;
  executionStatus?: WorkflowStatus;
  generation?: Record<string, unknown>;
  review?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
