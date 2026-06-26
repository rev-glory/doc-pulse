export enum RealtimeWorkflowStage {
  Queued = 'Queued',
  Cloning = 'Cloning',
  Analyzing = 'Analyzing',
  Writing = 'Writing',
  Reviewing = 'Reviewing',
  CreatingPR = 'CreatingPR',
  Completed = 'Completed',
  Failed = 'Failed',
}

export enum WorkflowEventType {
  WorkflowStarted = 'workflow.started',
  WorkflowProgress = 'workflow.progress',
  WorkflowStageChanged = 'workflow.stage.changed',
  WorkflowNodeStarted = 'workflow.node.started',
  WorkflowNodeCompleted = 'workflow.node.completed',
  WorkflowCompleted = 'workflow.completed',
  WorkflowFailed = 'workflow.failed',
  WorkflowCancelled = 'workflow.cancelled',
  QueueEvent = 'queue.event',
}

export enum QueueEventStatus {
  Queued = 'queued',
  Waiting = 'waiting',
  Active = 'active',
  Completed = 'completed',
  Failed = 'failed',
  Stalled = 'stalled',
}

export interface NodeExecutionEventMetadata {
  nodeName: string;
  status: 'started' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  duration?: number;
}

export interface RealtimeEventPayload<T = Record<string, unknown>> {
  runId: string;
  repositoryId: string;
  workflowId: string;
  stage: RealtimeWorkflowStage;
  progress: number; // 0 to 100
  status: string; // e.g. 'running', 'completed', 'failed', 'queued'
  timestamp: string;
  eventType: WorkflowEventType | string;
  node?: NodeExecutionEventMetadata;
  queueStatus?: QueueEventStatus;
  metadata?: T;
}
