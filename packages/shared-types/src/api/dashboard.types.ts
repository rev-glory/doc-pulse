import { WorkflowRunSummary } from "./workflow.types.js";

export interface PullRequestSummary {
  id: string;
  prNumber: number | null;
  url: string | null;
  title: string;
  body: string | null;
  headBranch: string;
  baseBranch: string;
  status: "OPEN" | "MERGED" | "CLOSED";
  createdAt: string;
  mergedAt: string | null;
  repositoryId: string;
  repositoryName: string;
  repositoryOwner: string;
  criticScore: number;
  workflowRunId: string;
  commitSha: string;
  workflowStatus: string;
}

export interface GeneratedDocumentSummary {
  path: string;
  title: string;
  updatedAt: string;
  criticScore: number;
}

export interface RepositoryDetail {
  id: string;
  githubRepositoryId: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
  language: string | null;
  htmlUrl: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  status: string;
  latestRun: WorkflowRunSummary | null;
  latestPullRequest: PullRequestSummary | null;
  recentRuns: WorkflowRunSummary[];
  generatedDocs: GeneratedDocumentSummary[];
  criticScore: number;
}

export interface QueueStatusSummary {
  activeJobs: number;
  waitingJobs: number;
  completedJobs: number;
  failedJobs: number;
  status: string;
}

export interface DashboardStats {
  totalRepositories: number;
  activeWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  queueStatus: QueueStatusSummary;
  recentRuns: WorkflowRunSummary[];
  recentPullRequests: PullRequestSummary[];
}
