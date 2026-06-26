import { Injectable, Logger } from '@nestjs/common';
import { AIProviderException } from '../exceptions/ai-provider.exception';

export interface RetryPolicyOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

@Injectable()
export class RetryPolicyService {
  private readonly logger = new Logger(RetryPolicyService.name);

  /**
   * Executes an async operation with exponential backoff and jitter.
   * Retries on 429 (Rate Limit), 5xx (Server Error), timeouts, and network connection drops.
   */
  public async execute<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: RetryPolicyOptions = {},
  ): Promise<T> {
    const maxAttempts = options.maxAttempts ?? 3;
    const baseDelayMs = options.baseDelayMs ?? 1000;
    const maxDelayMs = options.maxDelayMs ?? 10000;

    let attempt = 1;

    while (true) {
      try {
        return await operation();
      } catch (error: unknown) {
        if (attempt >= maxAttempts || !this.isRetryableError(error)) {
          this.logger.error(
            `[${operationName}] Failed permanently on attempt ${attempt}/${maxAttempts}: ${error instanceof Error ? error.message : String(error)}`,
          );
          throw error;
        }

        const backoffDelay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        const jitter = Math.random() * 200;
        const totalDelay = backoffDelay + jitter;

        this.logger.warn(
          `[${operationName}] Encountered retryable failure on attempt ${attempt}/${maxAttempts}. Retrying in ${Math.round(totalDelay)}ms... Cause: ${error instanceof Error ? error.message : String(error)}`,
        );

        await this.sleep(totalDelay);
        attempt++;
      }
    }
  }

  private isRetryableError(error: unknown): boolean {
    const errorStr = error instanceof Error ? `${error.message} ${error.stack || ''}` : String(error);
    const causeStr =
      error instanceof AIProviderException && error.cause
        ? `${error.cause instanceof Error ? error.cause.message : String(error.cause)}`
        : '';

    const combinedStr = `${errorStr} ${causeStr}`.toLowerCase();

    // Check HTTP status codes or typical error substrings
    if (
      combinedStr.includes('429') ||
      combinedStr.includes('quota') ||
      combinedStr.includes('rate limit') ||
      combinedStr.includes('500') ||
      combinedStr.includes('502') ||
      combinedStr.includes('503') ||
      combinedStr.includes('504') ||
      combinedStr.includes('overloaded') ||
      combinedStr.includes('timeout') ||
      combinedStr.includes('etimedout') ||
      combinedStr.includes('econnreset') ||
      combinedStr.includes('socket hang up')
    ) {
      return true;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
