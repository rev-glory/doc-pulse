import { Injectable, Logger } from '@nestjs/common';
import { AIProviderException } from '../exceptions/ai-provider.exception';
import { DelayedRetryWorkflowError } from '../../queue/types/queue-errors';

export interface RetryPolicyOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
}

@Injectable()
export class RetryPolicyService {
  private readonly logger = new Logger(RetryPolicyService.name);

  /**
   * Executes an async operation with exponential backoff and jitter.
   * Retries on 429 (Rate Limit), 5xx (Server Error), timeouts, and network connection drops.
   * Supports early cancellation via AbortSignal.
   */
  public async execute<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: RetryPolicyOptions = {},
  ): Promise<T> {
    const maxAttempts = options.maxAttempts ?? 3;
    const baseDelayMs = options.baseDelayMs ?? 1000;
    const maxDelayMs = options.maxDelayMs ?? 10000;
    const signal = options.signal;

    let attempt = 1;

    while (true) {
      if (signal?.aborted) {
        throw new Error(`[${operationName}] Operation aborted: execution cancelled.`);
      }

      try {
        const resultPromise = operation();
        if (signal) {
          const abortError = new Error(`[${operationName}] Operation aborted: execution cancelled.`);
          const abortPromise = new Promise<never>((_, reject) => {
            if (signal.aborted) reject(abortError);
            signal.addEventListener('abort', () => reject(abortError), { once: true });
          });
          return await Promise.race([resultPromise, abortPromise]);
        }
        return await resultPromise;
      } catch (error: unknown) {
        if (signal?.aborted) {
          throw new Error(`[${operationName}] Operation aborted: execution cancelled.`);
        }

        if (attempt >= maxAttempts || !this.isRetryableError(error)) {
          this.logger.error(
            `[${operationName}] Failed permanently on attempt ${attempt}/${maxAttempts}: ${error instanceof Error ? error.message : String(error)}`,
          );
          throw error;
        }

        const isRateLimit = this.isRateLimitError(error);
        const extractedDelay = isRateLimit ? this.extractRetryDelayMs(error) : null;

        let totalDelay: number;
        if (extractedDelay !== null && extractedDelay > 0) {
          totalDelay = extractedDelay;
        } else if (isRateLimit) {
          // Treat unparseable rate limit errors (429) with a much longer fallback delay (60s)
          totalDelay = 60000;
        } else {
          const backoffDelay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
          const jitter = Math.random() * 200;
          totalDelay = backoffDelay + jitter;
        }

        if (isRateLimit && totalDelay >= 5000) {
          this.logger.warn(
            `[${operationName}] Rate limit HTTP 429 encountered with retryDelay=${Math.round(totalDelay)}ms. Delegating long retry to BullMQ.`,
          );
          throw new DelayedRetryWorkflowError(
            'Rate limit exceeded (HTTP 429). Delegating retry to BullMQ.',
            Math.round(totalDelay),
            { operationName, attempt, cause: error instanceof Error ? error.message : String(error) },
          );
        }

        this.logger.warn(
          `[${operationName}] Encountered retryable failure on attempt ${attempt}/${maxAttempts}. Retrying in ${Math.round(totalDelay)}ms... Cause: ${error instanceof Error ? error.message : String(error)}`,
        );

        await this.sleep(totalDelay, signal);
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
      combinedStr.includes('resource_exhausted') ||
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

  private isRateLimitError(error: unknown): boolean {
    const errorStr = error instanceof Error ? `${error.message} ${error.stack || ''}` : String(error);
    const causeStr =
      error instanceof AIProviderException && error.cause
        ? `${error.cause instanceof Error ? error.cause.message : String(error.cause)}`
        : '';
    const combinedStr = `${errorStr} ${causeStr}`.toLowerCase();
    return (
      combinedStr.includes('429') ||
      combinedStr.includes('resource_exhausted') ||
      combinedStr.includes('quota') ||
      combinedStr.includes('rate limit')
    );
  }

  private extractRetryDelayMs(error: unknown): number | null {
    const queue: any[] = [];
    let current: any = error;
    while (current) {
      queue.push(current);
      current = current.cause ?? current.causeError ?? current.error;
    }

    for (const item of queue) {
      if (!item) continue;

      const details =
        item.errorDetails ??
        item.details ??
        item.response?.data?.error?.details ??
        item.response?.error?.details ??
        item.error?.details;

      if (Array.isArray(details)) {
        for (const detail of details) {
          if (detail && typeof detail === 'object') {
            const typeUrl = detail['@type'] || '';
            const isRetryInfo = typeUrl.includes('RetryInfo') || detail.retryDelay !== undefined;
            if (isRetryInfo) {
              const delayVal = detail.retryDelay ?? detail;
              const ms = this.parseDelayValueToMs(delayVal);
              if (ms !== null) return ms;
            }
          }
        }
      }

      if (typeof item === 'object') {
        if ('retryDelay' in item) {
          const ms = this.parseDelayValueToMs(item.retryDelay);
          if (ms !== null) return ms;
        }
        if (item.error && typeof item.error === 'object' && 'retryDelay' in item.error) {
          const ms = this.parseDelayValueToMs(item.error.retryDelay);
          if (ms !== null) return ms;
        }
      }

      const str = item instanceof Error ? `${item.message} ${item.stack ?? ''}` : typeof item === 'string' ? item : JSON.stringify(item);
      if (str) {
        const match = str.match(/retryDelay\s*[=:]\s*"?(\d+(?:\.\d+)?)s"?/i) || str.match(/seconds"?\s*:\s*(\d+)/i);
        if (match && match[1]) {
          const sec = parseFloat(match[1]);
          if (!isNaN(sec) && sec > 0) {
            return Math.round(sec * 1000);
          }
        }
      }
    }

    return null;
  }

  private parseDelayValueToMs(val: any): number | null {
    if (!val) return null;
    if (typeof val === 'string') {
      const match = val.match(/^(\d+(?:\.\d+)?)s?$/i);
      if (match && match[1]) {
        const num = parseFloat(match[1]);
        if (!isNaN(num) && num > 0) {
          return val.endsWith('s') || val.endsWith('S') || num < 1000 ? Math.round(num * 1000) : Math.round(num);
        }
      }
    } else if (typeof val === 'number' && !isNaN(val) && val > 0) {
      return val < 1000 ? Math.round(val * 1000) : Math.round(val);
    } else if (typeof val === 'object' && val.seconds !== undefined) {
      const sec = Number(val.seconds);
      const nanos = Number(val.nanos ?? 0);
      if (!isNaN(sec)) {
        return Math.round(sec * 1000 + nanos / 1e6);
      }
    }
    return null;
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timer);
        reject(new Error('Operation aborted: sleep cancelled.'));
      };
      const timer = setTimeout(() => {
        if (signal) {
          signal.removeEventListener('abort', onAbort);
        }
        resolve();
      }, ms);
      if (signal) {
        if (signal.aborted) {
          clearTimeout(timer);
          reject(new Error('Operation aborted: sleep cancelled.'));
        } else {
          signal.addEventListener('abort', onAbort, { once: true });
        }
      }
    });
  }
}

