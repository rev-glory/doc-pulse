import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { WORKFLOW_EXECUTION_QUEUE } from '../constants/queue.constants';
import type { WorkflowJobPayload } from '../interfaces/workflow-job.interface';
import { WorkflowExecutorService } from '../../workflow/graph/workflow-executor.service';
import type { WorkflowState } from '../../../domain/workflow';

@Processor(WORKFLOW_EXECUTION_QUEUE)
export class WorkflowProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowProcessor.name);

  constructor(private readonly executorService: WorkflowExecutorService) {
    super();
  }

  /**
   * Consumes workflow execution jobs and orchestrates explicit LangGraph execution modes.
   */
  public async process(job: Job<WorkflowJobPayload>): Promise<WorkflowState> {
    const { repositoryId, repositoryPath, runId, executionMode = 'start', metadata } = job.data;
    const jobId = job.id ?? 'unknown';

    this.logger.log('Job started', {
      jobId,
      runId,
      repositoryId,
      executionMode,
      queue: WORKFLOW_EXECUTION_QUEUE,
    });

    try {
      const input = {
        runId,
        repositoryId,
        workspacePath: repositoryPath,
        metadata: metadata ?? {},
      };

      let finalState: WorkflowState;
      switch (executionMode) {
        case 'resume':
          finalState = await this.executorService.resume(input);
          break;
        case 'restart':
          finalState = await this.executorService.restart(input);
          break;
        case 'start':
        default:
          finalState = await this.executorService.start(input);
          break;
      }

      this.logger.log('Job completed', {
        jobId,
        runId,
        repositoryId,
        executionMode,
        queue: WORKFLOW_EXECUTION_QUEUE,
      });

      return finalState;
    } catch (error) {
      this.logger.error('Job failed', {
        jobId,
        runId,
        repositoryId,
        executionMode,
        queue: WORKFLOW_EXECUTION_QUEUE,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }
}
