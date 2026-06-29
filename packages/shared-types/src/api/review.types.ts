import { RunStatus } from "./workflow.types.js";

export interface CriticIssue {
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  category: string;
  message: string;
  location?: string;
}

export interface DocumentationReview {
  documentType: string;
  score: number;
  approved: boolean;
  issues: CriticIssue[];
  suggestions: string[];
}

export interface CriticReview {
  score: number;
  passed: boolean;
  approvedCount: number;
  failedCount: number;
  totalDocuments: number;
  issues: string[];
  suggestions: string[];
  reviews?: DocumentationReview[];
}

export interface GeneratedDocument {
  id: string;
  path: string;
  title: string;
  markdown: string;
  summary: string;
  type: string;
  score?: number;
  content?: string;
  metrics?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    generationDurationMs: number;
    promptVersion: number;
    model: string;
  };
}

export interface ReviewDetail {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  comment: string | null;
  reviewer: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  workflowRunId: string;
  repositoryId: string;
  repositoryName: string;
  repositoryOwner: string;
  commitSha: string;
  branch: string;
  workflowStage: string | null;
  workflowStatus: RunStatus;
  generatedDocuments: GeneratedDocument[];
  criticReview: CriticReview | null;
}
