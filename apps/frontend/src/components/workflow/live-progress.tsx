import React from 'react';
import { WorkflowStatusBadge } from './workflow-status-badge';

export interface LiveProgressProps {
  stage: string;
  progress: number;
  status: string;
  errorMessage?: string;
}

export const LiveProgress: React.FC<LiveProgressProps> = ({ stage, progress, status, errorMessage }) => {
  const boundedProgress = Math.max(0, Math.min(100, Math.round(progress || 0)));

  return (
    <div style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <strong>Current Stage: </strong>
          <span>{stage || 'Queued'}</span>
        </div>
        <WorkflowStatusBadge status={status} />
      </div>

      <div style={{ marginBottom: '8px' }}>
        <span>Progress: {boundedProgress}%</span>
        <progress value={boundedProgress} max={100} style={{ width: '100%', height: '16px' }} />
      </div>

      {errorMessage && (
        <div style={{ color: 'red', marginTop: '8px' }}>
          <strong>Error: </strong>
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
