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
    message.includes('validation failed')
  ) {
    return QueueErrorClassification.PERMANENT;
  }

  // Transient failure signatures (Redis timeouts, GitHub rate limits, Gemini timeout, network glitches, optimistic lock contention)
  return QueueErrorClassification.TRANSIENT;
}
