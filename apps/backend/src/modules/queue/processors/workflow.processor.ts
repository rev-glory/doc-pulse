import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { WORKFLOW_EXECUTION_QUEUE } from '../constants/queue.constants';
import type { WorkflowJobPayload } from '../interfaces/workflow-job.interface';
import { WorkflowService } from '../../workflow/services/workflow.service';
import type { WorkflowState } from '../../../domain/workflow';

@Processor(WORKFLOW_EXECUTION_QUEUE)
export class WorkflowProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowProcessor.name);

  constructor(private readonly workflowService: WorkflowService) {
    super();
  }

  /**
   * Consumes workflow execution jobs and orchestrates synchronous LangGraph execution.
   */
  public async process(job: Job<WorkflowJobPayload>): Promise<WorkflowState> {
    const { repositoryId, repositoryPath, runId } = job.data;
    const jobId = job.id ?? 'unknown';

    this.logger.log('Job started', {
      jobId,
      runId,
      repositoryId,
      queue: WORKFLOW_EXECUTION_QUEUE,
    });

    try {
      const initialState = this.constructInitialState(repositoryId, repositoryPath, runId);

      const finalState = await this.workflowService.run(initialState);

      this.logger.log('Job completed', {
        jobId,
        runId,
        repositoryId,
        queue: WORKFLOW_EXECUTION_QUEUE,
      });

      return finalState;
    } catch (error) {
      this.logger.error('Job failed', {
        jobId,
        runId,
        repositoryId,
        queue: WORKFLOW_EXECUTION_QUEUE,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }

  /**
   * Constructs the baseline WorkflowState contract from queue job payload.
   * No database lookups are performed; downstream LangGraph nodes enrich this state.
   */
  private constructInitialState(repositoryId: string, repositoryPath: string, runId: string): WorkflowState {
    const pathParts = repositoryPath.split(/[/\\]/).filter(Boolean);
    const repositoryName = pathParts[pathParts.length - 1] ?? repositoryId;

    return {
      runId,
      repositoryId,
      repository: {
        name: repositoryName,
        rootPath: repositoryPath,
        packageManager: null,
        isMonorepo: false,
        workspaceType: null,
        languages: [],
        frameworks: [],
        buildTools: [],
        testFrameworks: [],
        dependencies: [],
        scripts: {},
        dockerSupport: [],
        ciCdSupport: [],
        environmentFiles: [],
        documentation: [],
        workspaceFolders: [],
        apiSpecifications: [],
        metrics: {
          packageCount: 0,
          workspaceCount: 0,
          documentationCount: 0,
          configurationFileCount: 0,
        },
      },
      documentation: {
        documentationFiles: [],
        missingDocuments: [],
        outdatedDocuments: [],
      },
    };
  }
}
