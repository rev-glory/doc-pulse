import React from 'react';
import { RealtimeWorkflowStage } from '@docpulse/shared-types';

export interface WorkflowTimelineProps {
  currentStage: RealtimeWorkflowStage | string;
  status?: string;
}

const STEPS = [
  { id: RealtimeWorkflowStage.Queued, label: 'Queued' },
  { id: RealtimeWorkflowStage.Cloning, label: 'Cloning' },
  { id: RealtimeWorkflowStage.Analyzing, label: 'Analyzing' },
  { id: RealtimeWorkflowStage.Writing, label: 'Writing' },
  { id: RealtimeWorkflowStage.Reviewing, label: 'Reviewing' },
  { id: RealtimeWorkflowStage.CreatingPR, label: 'Creating PR' },
  { id: RealtimeWorkflowStage.Completed, label: 'Done' },
];

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({ currentStage, status }) => {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <h4>Workflow Timeline</h4>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        {STEPS.map((step, idx) => {
          const isDone = currentIndex > idx || currentStage === RealtimeWorkflowStage.Completed;
          const isCurrent = currentIndex === idx && currentStage !== RealtimeWorkflowStage.Completed && status !== 'failed';
          const isFailed = currentIndex === idx && status === 'failed';

          let indicator = '[ ]';
          if (isDone) indicator = '[x]';
          if (isCurrent) indicator = '[>]';
          if (isFailed) indicator = '[!]';

          return (
            <React.Fragment key={step.id}>
              <span
                style={{
                  fontWeight: isCurrent || isFailed ? 'bold' : 'normal',
                  color: isFailed ? 'red' : isCurrent ? 'blue' : isDone ? 'green' : 'gray',
                }}
              >
                {indicator} {step.label}
              </span>
              {idx < STEPS.length - 1 && <span>&rarr;</span>}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
