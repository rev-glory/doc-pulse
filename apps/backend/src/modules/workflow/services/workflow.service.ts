import { Injectable, Logger } from '@nestjs/common';
import { WorkflowExecutorService } from '../graph/workflow-executor.service';
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
  public async run(initialState: WorkflowState, executionMode: 'start' | 'resume' | 'restart' = 'start'): Promise<WorkflowState> {
    this.logger.debug(`Delegating workflow run [${initialState.runId}] (mode: ${executionMode}) to WorkflowExecutorService...`);

    const input = {
      runId: initialState.runId ?? 'unknown',
      repositoryId: initialState.repositoryId ?? initialState.repository?.name ?? 'unknown',
      workspacePath: initialState.repository?.rootPath ?? '',
      metadata: initialState.generation ?? {},
    };

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
