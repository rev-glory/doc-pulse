'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { RealtimeEventPayload, RealtimeWorkflowStage, WorkflowEventType } from '@docpulse/shared-types';

export interface WorkflowSocketOptions {
  workflowId?: string;
  repositoryId?: string;
  runId?: string;
  autoConnect?: boolean;
}

export interface WorkflowSocketState {
  isConnected: boolean;
  stage: RealtimeWorkflowStage;
  progress: number;
  status: string;
  error?: string;
  history: RealtimeEventPayload[];
  queuePosition?: number;
  queueStatus?: string;
}

export function useWorkflowSocket(options: WorkflowSocketOptions): WorkflowSocketState {
  const { workflowId, repositoryId, runId, autoConnect = true } = options;

  const [state, setState] = useState<WorkflowSocketState>({
    isConnected: false,
    stage: RealtimeWorkflowStage.Queued,
    progress: 0,
    status: 'pending',
    history: [],
  });

  const socketRef = useRef<Socket | null>(null);

  const handleEvent = useCallback((payload: RealtimeEventPayload) => {
    setState((prev) => {
      const nextHistory = [payload, ...prev.history].slice(0, 50); // keep last 50 events
      const errorMsg =
        payload.status === 'failed' && payload.metadata && typeof payload.metadata === 'object' && 'error' in payload.metadata
          ? String(payload.metadata.error)
          : prev.error;

      return {
        ...prev,
        stage: payload.stage ?? prev.stage,
        progress: payload.progress ?? prev.progress,
        status: payload.status ?? prev.status,
        error: errorMsg,
        history: nextHistory,
        queueStatus: payload.queueStatus ?? prev.queueStatus,
      };
    });
  }, []);

  useEffect(() => {
    if (!autoConnect || (!workflowId && !repositoryId && !runId)) {
      return;
    }

    const wsUrl = process.env['NEXT_PUBLIC_WS_URL'] || 'http://localhost:3001';
    const socket = io(wsUrl, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setState((prev) => ({ ...prev, isConnected: true }));
      socket.emit('subscribe', { workflowId, repositoryId, runId });
    });

    socket.on('disconnect', () => {
      setState((prev) => ({ ...prev, isConnected: false }));
    });

    socket.on('connect_error', (err) => {
      setState((prev) => ({ ...prev, isConnected: false, error: err.message }));
    });

    // Listen to standard event names
    const eventNames = [
      WorkflowEventType.WorkflowStarted,
      WorkflowEventType.WorkflowProgress,
      WorkflowEventType.WorkflowStageChanged,
      WorkflowEventType.WorkflowNodeStarted,
      WorkflowEventType.WorkflowNodeCompleted,
      WorkflowEventType.WorkflowCompleted,
      WorkflowEventType.WorkflowFailed,
      WorkflowEventType.WorkflowCancelled,
      WorkflowEventType.QueueEvent,
      'workflow.event',
    ];

    eventNames.forEach((evt) => {
      socket.on(evt, handleEvent);
    });

    return () => {
      socket.emit('unsubscribe', { workflowId, repositoryId, runId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [workflowId, repositoryId, runId, autoConnect, handleEvent]);

  return state;
}
