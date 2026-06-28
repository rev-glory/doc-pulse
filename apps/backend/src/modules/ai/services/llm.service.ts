import { Inject, Injectable, Logger } from '@nestjs/common';

import { LLM_PROVIDER } from '../constants/ai.constants';
import type { ILlmProvider } from '../interfaces/llm-provider.interface';
import type {
  GenerationOptions,
  LlmResponse,
  StreamGenerationOptions,
  StructuredGenerationOptions,
} from '../types/llm.types';
import { RetryPolicyService } from './retry-policy.service';
import { LlmException, isLlmException } from '../errors/llm-exception';
import { LlmErrorCode } from '../errors/llm-error-code';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    @Inject(LLM_PROVIDER)
    private readonly provider: ILlmProvider,
    private readonly retryPolicy: RetryPolicyService,
  ) {}

  /**
   * Generate a plain-text response with provider resiliency.
   */
  async generateText(options: GenerationOptions): Promise<LlmResponse> {
    this.logger.debug('Delegating generateText to provider via RetryPolicy');
    try {
      return await this.retryPolicy.execute('generateText', () => this.provider.generateText(options), {
        signal: options.signal,
      });
    } catch (error: unknown) {
      if (isLlmException(error)) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new LlmException(
        LlmErrorCode.UNKNOWN,
        `Unexpected LLM service failure during generateText: ${message}`,
        { provider: 'LlmService', model: 'unknown' },
        'generateText',
        undefined,
        error,
      );
    }
  }

  /**
   * Generate a structured JSON response conforming to the provided schema with provider resiliency.
   */
  async generateStructured(options: StructuredGenerationOptions): Promise<LlmResponse> {
    this.logger.debug('Delegating generateStructured to provider via RetryPolicy');
    try {
      return await this.retryPolicy.execute(
        'generateStructured',
        () => this.provider.generateStructured(options),
        { signal: options.signal },
      );
    } catch (error: unknown) {
      if (isLlmException(error)) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new LlmException(
        LlmErrorCode.UNKNOWN,
        `Unexpected LLM service failure during generateStructured: ${message}`,
        { provider: 'LlmService', model: 'unknown' },
        'generateStructured',
        undefined,
        error,
      );
    }
  }

  /**
   * Stream a text response as an async generator of incremental chunks.
   */
  async *streamText(options: StreamGenerationOptions): AsyncGenerator<LlmResponse> {
    this.logger.debug('Delegating streamText to provider');
    try {
      const generator = this.provider.streamText(options);
      for await (const chunk of generator) {
        yield chunk;
      }
    } catch (error: unknown) {
      if (isLlmException(error)) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new LlmException(
        LlmErrorCode.UNKNOWN,
        `Unexpected LLM service failure during streamText: ${message}`,
        { provider: 'LlmService', model: 'unknown' },
        'streamText',
        undefined,
        error,
      );
    }
  }
}
