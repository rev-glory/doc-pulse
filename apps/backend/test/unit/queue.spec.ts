import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';

import { WorkflowQueueService } from '../../src/modules/queue/services/workflow-queue.service';
import { WorkflowProcessor } from '../../src/modules/queue/processors/workflow.processor';
import { RUN_WORKFLOW_JOB, WORKFLOW_EXECUTION_QUEUE } from '../../src/modules/queue/constants/queue.constants';
import type { WorkflowJobPayload } from '../../src/modules/queue/interfaces/workflow-job.interface';

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

    beforeEach(() => {
      mockWorkflowService = { run: mock.fn() };
      processor = new WorkflowProcessor(mockWorkflowService as any);
    });

    it('should consume job, construct initial WorkflowState, and invoke WorkflowService.run()', async () => {
      const payload: WorkflowJobPayload = {
        repositoryId: 'repo-123',
        repositoryPath: '/repos/doc-pulse',
        runId: 'run-456',
      };

      const mockJob = { id: 'job-999', data: payload } as any;
      const expectedFinalState = { executionStatus: 'SUCCESS' } as any;

      mockWorkflowService.run.mock.mockImplementation(async (state: any) => {
        assert.equal(state.runId, 'run-456');
        assert.equal(state.repositoryId, 'repo-123');
        assert.equal(state.repository.name, 'doc-pulse');
        assert.equal(state.repository.rootPath, '/repos/doc-pulse');
        return expectedFinalState;
      });

      const result = await processor.process(mockJob);

      assert.equal(result, expectedFinalState);
      assert.equal(mockWorkflowService.run.mock.calls.length, 1);
    });

    it('should log and rethrow errors when WorkflowService execution fails', async () => {
      const mockJob = {
        id: 'job-error',
        data: { repositoryId: 'r-1', repositoryPath: '/p', runId: 'run-err' },
      } as any;

      mockWorkflowService.run.mock.mockImplementation(async () => {
        throw new Error('Node failure');
      });

      await assert.rejects(() => processor.process(mockJob), {
        message: 'Node failure',
      });
    });
  });
});
