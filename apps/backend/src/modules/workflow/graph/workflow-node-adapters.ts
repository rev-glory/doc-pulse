import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { RepositoryAnalyzerNode } from '../nodes/repository-analyzer.node';
import { DocumentationLocatorNode } from '../nodes/documentation-locator.node';
import { TechnicalWriterNode } from '../nodes/technical-writer.node';
import { DocumentationCriticNode } from '../nodes/documentation-critic.node';
import { WorkflowGraphState, WorkflowGraphUpdate, WorkflowError } from './graph.types';
import { WorkflowStatus } from '../../../domain/workflow';

export class WorkflowNodeExecutionException extends Error {
  constructor(
    public readonly node: string,
    public readonly causeError: Error,
    public readonly workflowError: WorkflowError,
  ) {
    super(`Node [${node}] execution failed: ${causeError.message}`);
    this.name = 'WorkflowNodeExecutionException';
  }
}

@Injectable()
export class WorkflowNodeAdapters {
  private readonly logger = new Logger(WorkflowNodeAdapters.name);

  constructor(
    private readonly repositoryAnalyzer: RepositoryAnalyzerNode,
    private readonly documentationLocator: DocumentationLocatorNode,
    private readonly technicalWriter: TechnicalWriterNode,
    private readonly documentationCritic: DocumentationCriticNode,
  ) {}

  private emitTransitionLog(
    runId: string | undefined,
    node: string,
    status: WorkflowStatus,
    durationMs: number,
  ): void {
    this.logger.log({
      runId: runId ?? 'unknown',
      node,
      status,
      durationMs,
    });
  }

  public async repositoryAnalyzerStep(state: WorkflowGraphState): Promise<WorkflowGraphUpdate> {
    const start = Date.now();
    try {
      const updated = await this.repositoryAnalyzer.invoke(
        state as unknown as Parameters<RepositoryAnalyzerNode['invoke']>[0],
      );
      const durationMs = Date.now() - start;
      this.emitTransitionLog(state.runId, 'RepositoryAnalyzer', WorkflowStatus.Running, durationMs);

      return {
        ...updated,
        currentNode: 'RepositoryAnalyzer',
        executionStatus: WorkflowStatus.Running,
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - start;
      this.emitTransitionLog(state.runId, 'RepositoryAnalyzer', WorkflowStatus.Failed, durationMs);
      const cause = error instanceof Error ? error : new Error(String(error));
      const wfError: WorkflowError = {
        node: 'RepositoryAnalyzer',
        message: cause.message,
        stack: cause.stack,
        timestamp: new Date().toISOString(),
      };
      throw new WorkflowNodeExecutionException('RepositoryAnalyzer', cause, wfError);
    }
  }

  public async documentationLocatorStep(state: WorkflowGraphState): Promise<WorkflowGraphUpdate> {
    const start = Date.now();
    try {
      const updated = await this.documentationLocator.invoke(
        state as unknown as Parameters<DocumentationLocatorNode['invoke']>[0],
      );
      const durationMs = Date.now() - start;
      this.emitTransitionLog(state.runId, 'DocumentationLocator', WorkflowStatus.Running, durationMs);

      return {
        ...updated,
        currentNode: 'DocumentationLocator',
        executionStatus: WorkflowStatus.Running,
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - start;
      this.emitTransitionLog(state.runId, 'DocumentationLocator', WorkflowStatus.Failed, durationMs);
      const cause = error instanceof Error ? error : new Error(String(error));
      const wfError: WorkflowError = {
        node: 'DocumentationLocator',
        message: cause.message,
        stack: cause.stack,
        timestamp: new Date().toISOString(),
      };
      throw new WorkflowNodeExecutionException('DocumentationLocator', cause, wfError);
    }
  }

  public async technicalWriterStep(state: WorkflowGraphState): Promise<WorkflowGraphUpdate> {
    const start = Date.now();
    try {
      const updated = await this.technicalWriter.invoke(
        state as unknown as Parameters<TechnicalWriterNode['invoke']>[0],
      );
      const durationMs = Date.now() - start;
      this.emitTransitionLog(state.runId, 'TechnicalWriter', WorkflowStatus.Running, durationMs);

      return {
        ...updated,
        currentNode: 'TechnicalWriter',
        executionStatus: WorkflowStatus.Running,
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - start;
      this.emitTransitionLog(state.runId, 'TechnicalWriter', WorkflowStatus.Failed, durationMs);
      const cause = error instanceof Error ? error : new Error(String(error));
      const wfError: WorkflowError = {
        node: 'TechnicalWriter',
        message: cause.message,
        stack: cause.stack,
        timestamp: new Date().toISOString(),
      };
      throw new WorkflowNodeExecutionException('TechnicalWriter', cause, wfError);
    }
  }

  public async documentationCriticStep(state: WorkflowGraphState): Promise<WorkflowGraphUpdate> {
    const start = Date.now();
    try {
      const updated = await this.documentationCritic.invoke(
        state as unknown as Parameters<DocumentationCriticNode['invoke']>[0],
      );
      const durationMs = Date.now() - start;
      this.emitTransitionLog(state.runId, 'DocumentationCritic', WorkflowStatus.Running, durationMs);

      return {
        ...updated,
        currentNode: 'DocumentationCritic',
        executionStatus: WorkflowStatus.Running,
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - start;
      this.emitTransitionLog(state.runId, 'DocumentationCritic', WorkflowStatus.Failed, durationMs);
      const cause = error instanceof Error ? error : new Error(String(error));
      const wfError: WorkflowError = {
        node: 'DocumentationCritic',
        message: cause.message,
        stack: cause.stack,
        timestamp: new Date().toISOString(),
      };
      throw new WorkflowNodeExecutionException('DocumentationCritic', cause, wfError);
    }
  }

  public async pullRequestGeneratorStep(state: WorkflowGraphState): Promise<WorkflowGraphUpdate> {
    const start = Date.now();
    try {
      throw new NotImplementedException('PullRequestGeneratorNode is not implemented yet');
    } catch (error: unknown) {
      const durationMs = Date.now() - start;
      this.emitTransitionLog(state.runId, 'PullRequestGenerator', WorkflowStatus.Failed, durationMs);
      const cause = error instanceof Error ? error : new Error(String(error));
      const wfError: WorkflowError = {
        node: 'PullRequestGenerator',
        message: cause.message,
        stack: cause.stack,
        timestamp: new Date().toISOString(),
      };
      throw new WorkflowNodeExecutionException('PullRequestGenerator', cause, wfError);
    }
  }
}
