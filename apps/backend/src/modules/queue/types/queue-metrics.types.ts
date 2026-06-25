export interface QueueSnapshotMetrics {
  jobsProcessed: number;
  jobsFailed: number;
  jobsRetried: number;
  dlqJobsRouted: number;
  averageProcessingDurationMs: number;
  activeDepth: number;
  waitingDepth: number;
}

export interface QueueMetricsCollector {
  recordJobProcessed(durationMs: number): void;
  recordJobFailed(isPermanent: boolean): void;
  recordJobRetry(): void;
  recordDlqRouted(): void;
  getSnapshot(): Promise<QueueSnapshotMetrics>;
}
