import React from 'react';

export interface QueueStatusProps {
  status?: string;
  position?: number;
  progress?: number;
}

export const QueueStatus: React.FC<QueueStatusProps> = ({ status = 'queued', position, progress = 0 }) => {
  return (
    <div style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '4px', marginTop: '8px' }}>
      <h4>Queue Status</h4>
      <div>
        <strong>Job Status: </strong> <span>{status}</span>
      </div>
      {position !== undefined && (
        <div>
          <strong>Position in Queue: </strong> <span>{position}</span>
        </div>
      )}
      <div>
        <strong>Estimated Completion: </strong> <span>{progress}%</span>
      </div>
    </div>
  );
};
