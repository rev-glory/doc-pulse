/**
 * Strongly typed payload contract for workflow execution BullMQ jobs.
 */
export interface WorkflowJobPayload {
  repositoryId: string;
  repositoryPath: string;
  runId: string;
}
