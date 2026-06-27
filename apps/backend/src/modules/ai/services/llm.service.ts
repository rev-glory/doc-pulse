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
    return this.retryPolicy.execute('generateText', () => this.provider.generateText(options), {
      signal: options.signal,
    });
  }

  /**
   * Generate a structured JSON response conforming to the provided schema with provider resiliency.
   */
  async generateStructured(options: StructuredGenerationOptions): Promise<LlmResponse> {
    this.logger.debug('Delegating generateStructured to provider via RetryPolicy');
    return this.retryPolicy.execute(
      'generateStructured',
      () => this.provider.generateStructured(options),
      { signal: options.signal },
    );
  }

  /**
   * Stream a text response as an async generator of incremental chunks.
   */
  streamText(options: StreamGenerationOptions): AsyncGenerator<LlmResponse> {
    this.logger.debug('Delegating streamText to provider');
    return this.provider.streamText(options);
  }
}
