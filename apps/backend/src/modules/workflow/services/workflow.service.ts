import { Injectable, Logger } from '@nestjs/common';
import { WorkflowExecutorService } from '../graph/workflow-executor.service';
import { WorkflowExecutionInput } from '../graph/graph.types';
import { WorkflowState } from '../../../domain/workflow';

/**
 * Unified execution facade for LangGraph documentation workflows.
 * Bypasses legacy duplicate graph building and delegates lifecycle directly to WorkflowExecutorService.
 */
@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(private readonly executorService: WorkflowExecutorService) {}

  /**
   * Executes or resumes a workflow run.
   */
  public async run(input: WorkflowExecutionInput, executionMode: 'start' | 'resume' | 'restart' = 'start'): Promise<WorkflowState> {
    this.logger.debug(`Delegating workflow run [${input.runId}] (mode: ${executionMode}) to WorkflowExecutorService...`);

    if (!input.repositoryId || input.repositoryId === 'unknown') {
      throw new Error('Missing or invalid repositoryId in workflow execution input');
    }

    switch (executionMode) {
      case 'resume':
        return this.executorService.resume(input);
      case 'restart':
        return this.executorService.restart(input);
      case 'start':
      default:
        return this.executorService.start(input);
    }
  }
}
