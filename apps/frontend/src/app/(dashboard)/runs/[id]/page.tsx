'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useWorkflowSocket } from '../../../../hooks/use-workflow-socket';
import { WorkflowTimeline, LiveProgress, QueueStatus } from '../../../../components/workflow';

export default function RunLiveExecutionPage(): React.JSX.Element {
  const params = useParams();
  const runId = typeof params?.id === 'string' ? params.id : 'default-run';

  const { isConnected, stage, progress, status, error, queuePosition, queueStatus } = useWorkflowSocket({
    runId,
    workflowId: runId,
    autoConnect: true,
  });

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Workflow Execution Live Stream</h2>
      <div style={{ marginBottom: '16px', fontSize: '14px', color: isConnected ? 'green' : 'gray' }}>
        WebSocket: {isConnected ? 'Connected' : 'Disconnected'} | Run ID: {runId}
      </div>

      <LiveProgress stage={stage} progress={progress} status={status} errorMessage={error} />

      <div style={{ marginTop: '16px' }}>
        <WorkflowTimeline currentStage={stage} status={status} />
      </div>

      <QueueStatus status={queueStatus || status} position={queuePosition} progress={progress} />
    </div>
  );
}
