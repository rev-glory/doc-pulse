import { LlmErrorCode } from "./llm-error-code";
import { LlmErrorClassifier } from "./llm-error-classifier";

export interface LlmProviderMetadata {
  provider: string;
  model: string;
}

export class LlmException extends Error {
  public override readonly name = "LlmException";

  constructor(
    public readonly code: LlmErrorCode,
    message: string,
    public readonly provider: LlmProviderMetadata,
    public readonly operation: string,
    public readonly providerStatus?: number,
    public readonly originalCause?: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, LlmException.prototype);
  }

  public get retryable(): boolean {
    return LlmErrorClassifier.isRetryable(this.code);
  }
}

export function isLlmException(error: unknown): error is LlmException {
  return error instanceof LlmException;
}
