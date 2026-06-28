import { LlmErrorCode } from './llm-error-code';

export class LlmErrorClassifier {
  public static isRetryable(code: LlmErrorCode): boolean {
    return [
      LlmErrorCode.RATE_LIMITED,
      LlmErrorCode.PROVIDER_UNAVAILABLE,
      LlmErrorCode.NETWORK_ERROR,
    ].includes(code);
  }

  public static isPermanent(code: LlmErrorCode): boolean {
    return !this.isRetryable(code);
  }
}
