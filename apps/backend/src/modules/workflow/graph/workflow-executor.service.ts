import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkflowNodeAdapters, WorkflowNodeExecutionException } from './workflow-node-adapters';
import { buildDocumentationWorkflowGraph, CompiledDocumentationGraph } from './documentation-workflow.graph';
import { WorkflowExecutionInput, WorkflowGraphState, WorkflowError } from './graph.types';
import { WorkflowState as DomainWorkflowState, WorkflowStatus } from '../../../domain/workflow';

@Injectable()
export class WorkflowExecutorService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowExecutorService.name);
  private compiledGraph!: CompiledDocumentationGraph;

  constructor(
    private readonly adapters: WorkflowNodeAdapters,
    private readonly configService: ConfigService,
  ) {}

  public onModuleInit(): void {
    this.logger.debug('Initializing WorkflowExecutorService...');
    const minDocScore = this.configService.get<number>('WORKFLOW_MIN_DOC_SCORE', 80);

    this.compiledGraph = buildDocumentationWorkflowGraph(this.adapters, { minDocScore });
    this.logger.debug(`LangGraph orchestration engine compiled (minDocScore threshold: ${minDocScore}).`);
  }

  public async execute(input: WorkflowExecutionInput): Promise<DomainWorkflowState> {
    const startTime = Date.now();
    this.logger.log(`[${input.runId}] Executing documentation workflow for repository [${input.repositoryId}]`);

    // Pure initial state without fabricated bootstrap models
    const initialState: Partial<WorkflowGraphState> = {
      runId: input.runId,
      repositoryId: input.repositoryId,
      workspacePath: input.workspacePath,
      executionStatus: WorkflowStatus.Pending,
      currentNode: 'START',
      errors: [],
      metadata: {
        ...(input.metadata ?? {}),
        startedAt: new Date().toISOString(),
      },
    };

    try {
      const finalState = await this.compiledGraph.invoke(initialState as WorkflowGraphState);
      const durationMs = Date.now() - startTime;

      this.logger.log(`[${input.runId}] Workflow execution completed successfully in ${durationMs}ms.`);

      return {
        ...finalState,
        executionStatus: WorkflowStatus.Completed,
        metadata: {
          ...(finalState.metadata ?? {}),
          completedAt: new Date().toISOString(),
          totalDurationMs: durationMs,
        },
      } as unknown as DomainWorkflowState;
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime;

      if (error instanceof WorkflowNodeExecutionException) {
        this.logger.error(
          `[${input.runId}] Workflow terminated at node [${error.node}] after ${durationMs}ms: ${error.workflowError.message}`,
          error.causeError.stack,
        );

        const failedState: Partial<WorkflowGraphState> = {
          ...initialState,
          executionStatus: WorkflowStatus.Failed,
          currentNode: error.node,
          errors: [error.workflowError],
          metadata: {
            ...(initialState.metadata ?? {}),
            failedAt: new Date().toISOString(),
            totalDurationMs: durationMs,
          },
        };

        Object.assign(error, { failedState });
        throw error;
      }

      const cause = error instanceof Error ? error : new Error(String(error));
      const wfError: WorkflowError = {
        node: 'WorkflowExecutor',
        message: cause.message,
        stack: cause.stack,
        timestamp: new Date().toISOString(),
      };

      this.logger.error(`[${input.runId}] Unexpected orchestration failure: ${cause.message}`, cause.stack);

      const unhandledException = new Error(`Workflow run [${input.runId}] failed: ${cause.message}`);
      Object.assign(unhandledException, {
        failedState: {
          ...initialState,
          executionStatus: WorkflowStatus.Failed,
          currentNode: 'WorkflowExecutor',
          errors: [wfError],
          metadata: {
            ...(initialState.metadata ?? {}),
            failedAt: new Date().toISOString(),
            totalDurationMs: durationMs,
          },
        },
        workflowError: wfError,
      });

      throw unhandledException;
    }
  }
}
