export enum WorkflowStatus {
  Pending = "Pending",
  Running = "Running",
  Completed = "Completed",
  Failed = "Failed",
  WaitingForReview = "waiting_for_review",
}

export enum GitOperationStatus {
  Pending = "Pending",
  Committed = "Committed",
  Pushed = "Pushed",
  PullRequestCreated = "PullRequestCreated",
  NoPullRequestRequired = "NoPullRequestRequired",
  RolledBack = "RolledBack",
  Failed = "Failed",
}
