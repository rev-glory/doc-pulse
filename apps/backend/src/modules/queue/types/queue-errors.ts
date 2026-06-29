import { isLlmException } from "../../ai/errors/llm-exception";
import { isGitException } from "../../git-operations/errors/git-exception";

export enum QueueErrorClassification {
  TRANSIENT = "TRANSIENT",
  PERMANENT = "PERMANENT",
}

export class PermanentWorkflowError extends Error {
  public readonly classification = QueueErrorClassification.PERMANENT;

  constructor(
    message: string,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PermanentWorkflowError";
  }
}

export class TransientWorkflowError extends Error {
  public readonly classification = QueueErrorClassification.TRANSIENT;

  constructor(
    message: string,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "TransientWorkflowError";
  }
}

export class DelayedRetryWorkflowError extends TransientWorkflowError {
  constructor(
    message: string = "Delayed retry scheduled",
    public readonly delayMs: number = 0,
    metadata?: Record<string, unknown>,
  ) {
    super(message, metadata);
    this.name = "DelayedRetryWorkflowError";
  }
}

/**
 * Helper to check for authentication/permission signatures that should not be retried.
 */
function isAuthOrPermissionError(message: string): boolean {
  const signatures = [
    "permission denied",
    "authentication failed",
    "error: 403",
    "could not read username",
    "repository access denied",
    "invalid credentials",
    "remote rejected",
  ];
  return signatures.some((sig) => message.includes(sig));
}

/**
 * Recursively traverses the cause chain of an error, checking known cause property keys.
 * Returns the first LlmException or GitException found anywhere in the chain, or null.
 */
function findDomainExceptionInCauseChain(
  error: unknown,
  visited = new Set<unknown>(),
): { retryable: boolean } | null {
  if (!error || typeof error !== "object") return null;
  if (visited.has(error)) return null;
  visited.add(error);

  // Check directly
  if (isLlmException(error)) return { retryable: error.retryable };
  if (isGitException(error)) return { retryable: error.retryable };

  // Recurse into known cause properties
  for (const key of ["cause", "originalCause", "inner"]) {
    const nested = (error as Record<string, unknown>)[key];
    if (nested) {
      const found = findDomainExceptionInCauseChain(nested, visited);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Classifies unknown exceptions into Transient or Permanent failures.
 * Permanent failures bypass retry loops and are sent directly to DLQ.
 *
 * Recursively unwraps cause chains so that a GitException or LlmException
 * nested inside a domain wrapper (e.g. CloneFailedException -> GitException)
 * still drives the classification decision.
 */
export function classifyWorkflowError(
  error: unknown,
): QueueErrorClassification {
  // 1. Walk the full cause chain first — domain exceptions take priority
  const domainException = findDomainExceptionInCauseChain(error);
  if (domainException !== null) {
    return domainException.retryable
      ? QueueErrorClassification.TRANSIENT
      : QueueErrorClassification.PERMANENT;
  }

  // 2. Explicit workflow classification marker
  if (error && typeof error === "object" && "classification" in error) {
    if ((error as any).classification === QueueErrorClassification.PERMANENT) {
      return QueueErrorClassification.PERMANENT;
    }
    return QueueErrorClassification.TRANSIENT;
  }

  const message = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase();

  // 3. Permanent failure signatures
  if (
    message.includes("not found") ||
    message.includes("cannot resume non-existent") ||
    message.includes("deleted") ||
    message.includes("invalid configuration") ||
    message.includes("unsupported") ||
    message.includes("malformed") ||
    message.includes("validation failed") ||
    isAuthOrPermissionError(message)
  ) {
    return QueueErrorClassification.PERMANENT;
  }

  // 4. Default: treat as transient (Redis timeouts, network glitches, lock contention, etc.)
  return QueueErrorClassification.TRANSIENT;
}
