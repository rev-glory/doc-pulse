import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database';
import { WorkflowNodeName, WorkflowStage, WorkflowCheckpointSnapshot } from '../../../domain/workflow';
import { RunStatus as PrismaRunStatus, WorkflowStage as PrismaWorkflowStage } from '@/generated/prisma/enums';

export class OptimisticLockException extends Error {
  constructor(runId: string, expectedVersion: number) {
    super(`Concurrent modification detected on WorkflowRun [${runId}]: expected version ${expectedVersion}`);
    this.name = 'OptimisticLockException';
  }
}

export interface RunRecordData {
  id: string;
  version: number;
  status: string;
  currentNode: string | null;
  currentStage: string | null;
  checkpointSnapshot: unknown;
  nodeRetries: unknown;
  lastError: unknown;
  executionMetadata: unknown;
  repositoryId: string;
  currentReviewId: string | null;
}

type PrismaRunStatusValue = (typeof PrismaRunStatus)[keyof typeof PrismaRunStatus];
type PrismaWorkflowStageValue = (typeof PrismaWorkflowStage)[keyof typeof PrismaWorkflowStage];

@Injectable()
export class WorkflowCheckpointRepository {
  private readonly logger = new Logger(WorkflowCheckpointRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private toPrismaWorkflowStage(stage: WorkflowStage): PrismaWorkflowStageValue {
    switch (stage) {
      case WorkflowStage.CLONING:
        return PrismaWorkflowStage.CLONING;
      case WorkflowStage.ANALYZING:
        return PrismaWorkflowStage.ANALYZING;
      case WorkflowStage.SOURCE_CODE_ANALYSIS:
        return PrismaWorkflowStage.ANALYZING;
      case WorkflowStage.LOCATING_DOCUMENTATION:
        return PrismaWorkflowStage.LOCATING_DOCUMENTATION;
      case WorkflowStage.WRITING:
        return PrismaWorkflowStage.WRITING;
      case WorkflowStage.REVIEWING:
        return PrismaWorkflowStage.REVIEWING;
      case WorkflowStage.COMMITTING:
        return PrismaWorkflowStage.COMMITTING;
      case WorkflowStage.PUSHING:
        return PrismaWorkflowStage.PUSHING;
      case WorkflowStage.CREATING_PULL_REQUEST:
        return PrismaWorkflowStage.CREATING_PULL_REQUEST;
      case WorkflowStage.FINISHED:
        return PrismaWorkflowStage.FINISHED;
    }
  }

  /**
   * Initializes or resets a WorkflowRun database record prior to execution.
   */
  public async initializeRun(data: {
    runId: string;
    repositoryId: string;
    correlationId: string;
    webhookDeliveryId: string;
    commitSha: string;
    branch: string;
  }): Promise<RunRecordData> {
    const now = new Date();
    const created = await this.prisma.workflowRun.upsert({
      where: { id: data.runId },
      update: {
        status: PrismaRunStatus.RUNNING,
        startedAt: now,
        updatedAt: now,
      },
      create: {
        id: data.runId,
        repositoryId: data.repositoryId,
        correlationId: data.correlationId,
        webhookDeliveryId: data.webhookDeliveryId,
        commitSha: data.commitSha,
        branch: data.branch,
        status: PrismaRunStatus.RUNNING,
        startedAt: now,
        version: 1,
        nodeRetries: {},
        executionMetadata: {
          initializedAt: now.toISOString(),
        },
      },
    });

    return created as unknown as RunRecordData;
  }

  /**
   * Loads an existing WorkflowRun record for recovery and state hydration.
   */
  public async loadRunRecord(runId: string): Promise<RunRecordData | null> {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
    });
    return (run as unknown as RunRecordData) ?? null;
  }

  /**
   * Atomically saves a node checkpoint inside a Prisma transaction.
   * Enforces optimistic locking and shallow-merges append-only execution metadata.
   */
  public async saveNodeCheckpoint(params: {
    runId: string;
    expectedVersion: number;
    nodeName: WorkflowNodeName;
    stage: WorkflowStage;
    snapshot: WorkflowCheckpointSnapshot;
    status: PrismaRunStatusValue;
    nodeRetries: Record<string, number>;
    error?: unknown;
    newMetadata?: Record<string, unknown>;
  }): Promise<number> {
    const { runId, expectedVersion, nodeName, stage, snapshot, status, nodeRetries, error, newMetadata } = params;

    return this.prisma.$transaction(async (tx) => {
      // 1. Verify current optimistic lock version and fetch existing metadata
      const existing = await tx.workflowRun.findUnique({
        where: { id: runId },
        select: { version: true, executionMetadata: true },
      });

      if (!existing || existing.version !== expectedVersion) {
        throw new OptimisticLockException(runId, expectedVersion);
      }

      // 2. Append-only shallow merge of executionMetadata
      const currentMetadata = (existing.executionMetadata && typeof existing.executionMetadata === 'object'
        ? existing.executionMetadata
        : {}) as Record<string, unknown>;

      const mergedMetadata = {
        ...currentMetadata,
        ...(newMetadata ?? {}),
        lastCheckpointAt: new Date().toISOString(),
      };

      // 3. Atomically update run record and increment version
      const nextVersion = expectedVersion + 1;
      const now = new Date();

      await tx.workflowRun.update({
        where: { id: runId },
        data: {
          version: nextVersion,
          currentNode: nodeName,
          currentStage: this.toPrismaWorkflowStage(stage),
          status,
          checkpointSnapshot: JSON.parse(JSON.stringify(snapshot)) as any,
          nodeRetries: JSON.parse(JSON.stringify(nodeRetries)) as any,
          lastError: (error ? JSON.parse(JSON.stringify(error)) : null) as any,
          errorMessage: error instanceof Error ? error.message : null,
          executionMetadata: JSON.parse(JSON.stringify(mergedMetadata)) as any,
          updatedAt: now,
          ...(status === 'COMPLETED' ? { completedAt: now } : {}),
        },
      });

      this.logger.debug(`Checkpoint persisted for run [${runId}] at node [${nodeName}] (v${nextVersion})`);
      return nextVersion;
    });
  }

  /**
   * Resets a WorkflowRun record for an explicit restart from START.
   */
  public async resetRunForRestart(runId: string): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.workflowRun.findUnique({
        where: { id: runId },
        select: { version: true, executionMetadata: true },
      });

      if (!existing) {
        throw new Error(`Cannot reset non-existent WorkflowRun [${runId}]`);
      }

      const nextVersion = existing.version + 1;
      const now = new Date();
      const currentMetadata = (existing.executionMetadata && typeof existing.executionMetadata === 'object'
        ? existing.executionMetadata
        : {}) as Record<string, unknown>;

      await tx.workflowRun.update({
        where: { id: runId },
        data: {
          version: nextVersion,
          currentNode: null,
          currentStage: null,
          checkpointSnapshot: null as any,
          nodeRetries: {},
          lastError: null as any,
          errorMessage: null,
          status: PrismaRunStatus.RUNNING,
          startedAt: now,
          completedAt: null,
          updatedAt: now,
          executionMetadata: {
            ...currentMetadata,
            restartedAt: now.toISOString(),
          },
        },
      });

      this.logger.log(`WorkflowRun [${runId}] reset for restart (v${nextVersion})`);
      return nextVersion;
    });
  }

  /**
   * Marks a WorkflowRun as completed in the database.
   */
  public async markRunCompleted(runId: string): Promise<void> {
    const now = new Date();
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: PrismaRunStatus.COMPLETED,
        completedAt: now,
        updatedAt: now,
      },
    });
    this.logger.log(`WorkflowRun [${runId}] marked as COMPLETED.`);
  }

  /**
   * Marks a WorkflowRun as failed in the database (unconditional update).
   */
  public async markRunFailed(runId: string, errorMessage: string): Promise<void> {
    const now = new Date();
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: PrismaRunStatus.FAILED,
        errorMessage,
        completedAt: now,
        updatedAt: now,
      },
    });
    this.logger.log(`WorkflowRun [${runId}] marked as FAILED. Error: ${errorMessage}`);
  }

  /**
   * Marks a WorkflowRun as checkpointed while waiting for human review.
   */
  public async markRunNeedsReview(runId: string): Promise<void> {
    const now = new Date();
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: PrismaRunStatus.CHECKPOINTED,
        currentNode: WorkflowNodeName.HumanReview,
        currentStage: PrismaWorkflowStage.REVIEWING,
        completedAt: null,
        errorMessage: null,
        updatedAt: now,
      },
    });
    this.logger.log(`WorkflowRun [${runId}] marked as CHECKPOINTED (awaiting human review).`);
  }
}
