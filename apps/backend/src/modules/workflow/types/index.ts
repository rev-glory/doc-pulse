export enum GeneratedDocumentType {
  README = 'readme',
  INSTALLATION = 'installation',
  ARCHITECTURE = 'architecture',
  DEPLOYMENT = 'deployment',
  API = 'api',
  CONTRIBUTING = 'contributing',
}

export interface GeneratedDocument {
  path: string;
  title: string;
  content: string;
  type: GeneratedDocumentType;
}

export interface CriticReview {
  score: number;
  passed: boolean;
  issues: string[];
  suggestions: string[];
}

export interface PullRequestDraft {
  branchName: string;
  title: string;
  description: string;
}

export type WorkflowExecutionStatus = 'pending' | 'running' | 'retrying' | 'completed' | 'failed';
