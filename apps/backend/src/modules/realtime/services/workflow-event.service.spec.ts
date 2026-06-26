import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { RealtimeWorkflowStage, WorkflowEventType, QueueEventStatus } from '@docpulse/shared-types';
import { WorkflowEventService } from './workflow-event.service';

describe('WorkflowEventService', () => {
  let service: WorkflowEventService;
  let emittedPayloads: any[] = [];

  const mockGateway: any = {
    emitEvent: (payload: any) => {
      emittedPayloads.push(payload);
    },
  };

  beforeEach(() => {
    emittedPayloads = [];
    service = new WorkflowEventService(mockGateway);
  });

  it('should publish general workflow event correctly', () => {
    service.publishWorkflowEvent({
      runId: 'run-1',
      repositoryId: 'repo-1',
      workflowId: 'wf-1',
      stage: RealtimeWorkflowStage.Analyzing,
      progress: 25,
      status: 'running',
      timestamp: '2026-06-26T00:00:00.000Z',
      eventType: WorkflowEventType.WorkflowProgress,
    });

    assert.strictEqual(emittedPayloads.length, 1);
    assert.strictEqual(emittedPayloads[0].runId, 'run-1');
    assert.strictEqual(emittedPayloads[0].stage, RealtimeWorkflowStage.Analyzing);
    assert.strictEqual(emittedPayloads[0].progress, 25);
  });

  it('should map node name to correct realtime stage', () => {
    assert.strictEqual(service.mapNodeToStage('RepositoryAnalyzer'), RealtimeWorkflowStage.Analyzing);
    assert.strictEqual(service.mapNodeToStage('TechnicalWriter'), RealtimeWorkflowStage.Writing);
    assert.strictEqual(service.mapNodeToStage('DocumentationCritic'), RealtimeWorkflowStage.Reviewing);
    assert.strictEqual(service.mapNodeToStage('GitCommit'), RealtimeWorkflowStage.CreatingPR);
  });

  it('should publish queue event formatted correctly', () => {
    service.publishQueueEvent('run-2', 'repo-2', 'wf-2', QueueEventStatus.Active, 10);
    assert.strictEqual(emittedPayloads.length, 1);
    assert.strictEqual(emittedPayloads[0].eventType, WorkflowEventType.QueueEvent);
    assert.strictEqual(emittedPayloads[0].stage, RealtimeWorkflowStage.Cloning);
  });
});
