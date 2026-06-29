import { RepositorySummary } from "../repository";
import { DocumentationInventory } from "../documentation";
import { SourceCodeAnalysis } from "../source-code-analysis/source-code-analysis";
import { WorkflowStatus, GitOperationStatus } from "./enums";
import {
  GeneratedDocument as SharedGeneratedDocument,
  CriticReview as SharedCriticReview,
  DocumentationReview as SharedDocumentationReview,
  CriticIssue as SharedCriticIssue,
} from "@docpulse/shared-types";

export enum GeneratedDocumentType {
  README = "README",
  INSTALLATION = "INSTALLATION",
  ARCHITECTURE = "ARCHITECTURE",
  API = "API",
  CONTRIBUTING = "CONTRIBUTING",
  DEPLOYMENT = "DEPLOYMENT",
}

export interface GeneratedDocumentMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  generationDurationMs: number;
  promptVersion: number;
  model: string;
}

export type GeneratedDocument = SharedGeneratedDocument & {
  type: GeneratedDocumentType;
  metrics?: GeneratedDocumentMetrics;
};

/**
 * Factory helper creating canonical GeneratedDocument instances.
 * Attaches non-enumerable getter for backward compatibility with 'content'
 * without duplicating markdown state in serialized checkpoint JSON.
 */
export function createGeneratedDocument(
  data: Omit<GeneratedDocument, "content">,
): GeneratedDocument {
  const doc = { ...data } as GeneratedDocument;
  Object.defineProperty(doc, "content", {
    get() {
      return (this as GeneratedDocument).markdown;
    },
    enumerable: false,
    configurable: true,
  });
  return doc;
}

export type ReviewIssue = SharedCriticIssue;

export interface ReviewMetrics {
  promptVersion: number;
  model: string;
  reviewDurationMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  reviewedAt: string;
}

export interface DocumentationReview extends Omit<
  SharedDocumentationReview,
  "documentType" | "issues"
> {
  documentType: GeneratedDocumentType;
  issues: ReviewIssue[];
  metrics?: ReviewMetrics;
}

export interface CriticReview extends Omit<SharedCriticReview, "reviews"> {
  reviews?: DocumentationReview[];
}

export interface PullRequestSummary {
  url: string;
  number: number;
  headBranch?: string;
  baseBranch?: string;
  title?: string;
  body?: string;
}

export interface WorkflowState {
  runId?: string;
  repositoryId?: string;
  repository: RepositorySummary;
  documentation: DocumentationInventory;
  generatedDocuments?: GeneratedDocument[];
  criticReview?: CriticReview;
  pullRequest?: PullRequestSummary;
  branchName?: string;
  commitSha?: string;
  pullRequestNumber?: number;
  pullRequestUrl?: string;
  gitOperationStatus?: GitOperationStatus;
  executionStatus?: WorkflowStatus;
  sourceCodeAnalysis?: SourceCodeAnalysis;
  generation?: Record<string, unknown>;
  review?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
