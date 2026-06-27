import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { QueueEventStatus, RealtimeWorkflowStage } from '@docpulse/shared-types';

import { WorkflowQueueService } from '../../src/modules/queue/services/workflow-queue.service';
import { WorkflowProcessor } from '../../src/modules/queue/processors/workflow.processor';
import { RUN_WORKFLOW_JOB, WORKFLOW_EXECUTION_QUEUE } from '../../src/modules/queue/constants/queue.constants';
import type { WorkflowJobPayload } from '../../src/modules/queue/interfaces/workflow-job.interface';
import { WorkflowStatus } from '../../src/domain/workflow';

describe('Queue Module Infrastructure Verification', () => {
  describe('WorkflowQueueService Producer', () => {
    let service: WorkflowQueueService;
    let mockQueue: { add: any };

    beforeEach(() => {
      mockQueue = { add: mock.fn() };
      service = new WorkflowQueueService(mockQueue as any);
    });

    it('should throw BadRequestException when payload is malformed or missing required properties', async () => {
      await assert.rejects(() => service.enqueueWorkflow(null as any), BadRequestException);
      await assert.rejects(
        () => service.enqueueWorkflow({ repositoryId: '', repositoryPath: '/path', runId: 'run-1' }),
        BadRequestException,
      );
      await assert.rejects(
        () => service.enqueueWorkflow({ repositoryId: 'repo-1', repositoryPath: '', runId: 'run-1' }),
        BadRequestException,
      );
    });

    it('should enqueue job into BullMQ and return job metadata', async () => {
      const payload: WorkflowJobPayload = {
        repositoryId: 'repo-123',
        repositoryPath: '/repos/doc-pulse',
        runId: 'run-456',
      };

      mockQueue.add.mock.mockImplementation(async (name: string, data: any) => {
        assert.equal(name, RUN_WORKFLOW_JOB);
        assert.deepEqual(data, payload);
        return {
          id: 'job-789',
          name: RUN_WORKFLOW_JOB,
          queueName: WORKFLOW_EXECUTION_QUEUE,
          timestamp: 1600000000000,
        };
      });

      const metadata = await service.enqueueWorkflow(payload);

      assert.equal(metadata.id, 'job-789');
      assert.equal(metadata.name, RUN_WORKFLOW_JOB);
      assert.equal(metadata.queueName, WORKFLOW_EXECUTION_QUEUE);
      assert.equal(metadata.timestamp, 1600000000000);
      assert.equal(mockQueue.add.mock.calls.length, 1);
    });
  });

  describe('WorkflowProcessor Consumer', () => {
    let processor: WorkflowProcessor;
    let mockWorkflowService: { run: any };
    let mockProgressPublisher: { publishJobProgress: any };

    beforeEach(() => {
      mockWorkflowService = { run: mock.fn() };
      mockProgressPublisher = { publishJobProgress: mock.fn(async () => undefined) };
      processor = new WorkflowProcessor(mockWorkflowService as any, mockProgressPublisher as any);
    });

    it('should consume job, construct initial WorkflowState, and invoke WorkflowService.run()', async () => {
      const payload: WorkflowJobPayload = {
        repositoryId: 'repo-123',
        repositoryPath: '/repos/doc-pulse',
        runId: 'run-456',
      };

      const mockJob = { id: 'job-999', data: payload, attemptsMade: 0 } as any;
      const expectedFinalState = { executionStatus: WorkflowStatus.Completed } as any;

      mockWorkflowService.run.mock.mockImplementation(async (input: any) => {
        assert.equal(input.runId, 'run-456');
        assert.equal(input.repositoryId, 'repo-123');
        assert.equal(input.workspacePath, '/repos/doc-pulse');
        return expectedFinalState;
      });

      const result = await processor.process(mockJob);

      assert.equal(result, expectedFinalState);
      assert.equal(mockWorkflowService.run.mock.calls.length, 1);
      assert.equal(mockProgressPublisher.publishJobProgress.mock.calls.length, 2);

      const terminalEvent = mockProgressPublisher.publishJobProgress.mock.calls[1]!.arguments[1];
      assert.equal(terminalEvent.queueStatus, QueueEventStatus.Completed);
      assert.equal(terminalEvent.realtimeStatus, 'completed');
      assert.equal(terminalEvent.realtimeStage, RealtimeWorkflowStage.Completed);
    });

    it('should publish waiting-for-review queue progress when executor suspends for human review', async () => {
      const mockJob = {
        id: 'job-review',
        data: { repositoryId: 'r-2', repositoryPath: '/repo', runId: 'run-review' },
        attemptsMade: 0,
      } as any;

      mockWorkflowService.run.mock.mockImplementation(async () => ({
        executionStatus: WorkflowStatus.NeedsReview,
      }));

      await processor.process(mockJob);

      const terminalEvent = mockProgressPublisher.publishJobProgress.mock.calls[1]!.arguments[1];
      assert.equal(terminalEvent.queueStatus, QueueEventStatus.Waiting);
      assert.equal(terminalEvent.realtimeStatus, 'waiting');
      assert.equal(terminalEvent.realtimeStage, RealtimeWorkflowStage.Reviewing);
    });

    it('should publish failed queue progress when executor returns a failed review outcome', async () => {
      const mockJob = {
        id: 'job-review-failed',
        data: { repositoryId: 'r-3', repositoryPath: '/repo', runId: 'run-review-failed' },
        attemptsMade: 0,
      } as any;

      mockWorkflowService.run.mock.mockImplementation(async () => ({
        executionStatus: WorkflowStatus.ReviewFailed,
      }));

      await processor.process(mockJob);

      const terminalEvent = mockProgressPublisher.publishJobProgress.mock.calls[1]!.arguments[1];
      assert.equal(terminalEvent.queueStatus, QueueEventStatus.Failed);
      assert.equal(terminalEvent.realtimeStatus, 'failed');
      assert.equal(terminalEvent.realtimeStage, RealtimeWorkflowStage.Reviewing);
    });

    it('should log and rethrow errors when WorkflowService execution fails', async () => {
      const mockJob = {
        id: 'job-error',
        data: { repositoryId: 'r-1', repositoryPath: '/p', runId: 'run-err' },
        attemptsMade: 0,
      } as any;

      mockWorkflowService.run.mock.mockImplementation(async () => {
        throw new Error('Node failure');
      });

      await assert.rejects(() => processor.process(mockJob), {
        message: 'Node failure',
      });

      const terminalEvent = mockProgressPublisher.publishJobProgress.mock.calls[1]!.arguments[1];
      assert.equal(terminalEvent.queueStatus, QueueEventStatus.Failed);
      assert.equal(terminalEvent.realtimeStatus, 'failed');
      assert.equal(terminalEvent.realtimeStage, RealtimeWorkflowStage.Failed);
    });
  });
});
