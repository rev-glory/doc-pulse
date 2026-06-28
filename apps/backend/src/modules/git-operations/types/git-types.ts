export interface GitStatus {
  conflicted: string[];
  modified: string[];
  created: string[];
  not_added: string[];
  staged: string[];
  isDirty: boolean;
}
