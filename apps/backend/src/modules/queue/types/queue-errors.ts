export enum QueueErrorClassification {
  TRANSIENT = 'TRANSIENT',
  PERMANENT = 'PERMANENT',
}

export class PermanentWorkflowError extends Error {
  public readonly classification = QueueErrorClassification.PERMANENT;

  constructor(message: string, public readonly metadata?: Record<string, unknown>) {
    super(message);
    this.name = 'PermanentWorkflowError';
  }
}

export class TransientWorkflowError extends Error {
  public readonly classification = QueueErrorClassification.TRANSIENT;

  constructor(message: string, public readonly metadata?: Record<string, unknown>) {
    super(message);
    this.name = 'TransientWorkflowError';
  }
}

export class DelayedRetryWorkflowError extends TransientWorkflowError {
  constructor(message: string = 'Delayed retry scheduled', public readonly delayMs: number = 0, metadata?: Record<string, unknown>) {
    super(message, metadata);
    this.name = 'DelayedRetryWorkflowError';
  }
}


/**
 * Helper to check for authentication/permission signatures that should not be retried.
 */
function isAuthOrPermissionError(message: string): boolean {
  const signatures = [
    'permission denied',
    'authentication failed',
    'error: 403',
    'could not read username',
    'repository access denied',
    'invalid credentials',
    'remote rejected',
  ];
  return signatures.some(sig => message.includes(sig));
}

/**
 * Classifies unknown exceptions into Transient or Permanent failures.
 * Permanent failures bypass retry loops and are sent directly to DLQ.
 */
export function classifyWorkflowError(error: unknown): QueueErrorClassification {
  if (error && typeof error === 'object' && 'classification' in error) {
    if ((error as any).classification === QueueErrorClassification.PERMANENT) {
      return QueueErrorClassification.PERMANENT;
    }
    return QueueErrorClassification.TRANSIENT;
  }

  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();

  // Permanent failure signatures
  if (
    message.includes('not found') ||
    message.includes('cannot resume non-existent') ||
    message.includes('deleted') ||
    message.includes('invalid configuration') ||
    message.includes('unsupported') ||
    message.includes('malformed') ||
    message.includes('validation failed') ||
    isAuthOrPermissionError(message)
  ) {
    return QueueErrorClassification.PERMANENT;
  }

  // Transient failure signatures (Redis timeouts, GitHub rate limits, Gemini timeout, network glitches, optimistic lock contention)
  return QueueErrorClassification.TRANSIENT;
}
