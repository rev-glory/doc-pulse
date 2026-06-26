export enum WorkflowStatus {
  Pending = 'Pending',
  Running = 'Running',
  Completed = 'Completed',
  Failed = 'Failed',
  NeedsReview = 'NeedsReview',
  RegenerationRequired = 'RegenerationRequired',
  ReviewFailed = 'ReviewFailed',
}

export enum GitOperationStatus {
  Pending = 'Pending',
  Committed = 'Committed',
  Pushed = 'Pushed',
  PullRequestCreated = 'PullRequestCreated',
  RolledBack = 'RolledBack',
  Failed = 'Failed',
}
