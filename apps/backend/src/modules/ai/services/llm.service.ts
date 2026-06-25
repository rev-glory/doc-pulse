import { Inject, Injectable, Logger } from '@nestjs/common';

import { LLM_PROVIDER } from '../constants/ai.constants';
import type { ILlmProvider } from '../interfaces/llm-provider.interface';
import type {
  GenerationOptions,
  LlmResponse,
  StreamGenerationOptions,
  StructuredGenerationOptions,
} from '../types/llm.types';

// ---------------------------------------------------------------------------
// LlmService
//
// The public API surface of the AI module.
//
// This is the ONLY service that other modules should import.
// It depends on ILlmProvider (via injection token), not on GeminiProvider.
//
// Design:
//   • Thin orchestration layer — no generation logic lives here.
//   • Responsible for logging at the service boundary.
//   • Future extensions (telemetry, caching, fallback providers) belong here.
//
// Usage:
//   // In your module:
//   imports: [AiModule]
//
//   // In your service constructor:
//   constructor(private readonly llmService: LlmService) {}
//
//   // Then call:
//   const response = await this.llmService.generateText({ prompt: '...' });
// ---------------------------------------------------------------------------

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    @Inject(LLM_PROVIDER)
    private readonly provider: ILlmProvider,
  ) {}

  /**
   * Generate a plain-text response.
   *
   * @param options - Prompt and optional generation parameters.
   * @returns The generated text and token usage statistics.
   */
  async generateText(options: GenerationOptions): Promise<LlmResponse> {
    this.logger.debug('Delegating generateText to provider');
    return this.provider.generateText(options);
  }

  /**
   * Generate a structured JSON response conforming to the provided schema.
   *
   * The caller is responsible for parsing `response.text` as JSON.
   * The provider guarantees the text is valid JSON matching the schema.
   *
   * @param options - Prompt, schema, and optional generation parameters.
   * @returns LlmResponse where `text` is a JSON string.
   */
  async generateStructured(options: StructuredGenerationOptions): Promise<LlmResponse> {
    this.logger.debug('Delegating generateStructured to provider');
    return this.provider.generateStructured(options);
  }

  /**
   * Stream a text response as an async generator of incremental chunks.
   *
   * @param options - Prompt and optional generation parameters.
   * @returns Async generator yielding partial LlmResponse chunks.
   *
   * @example
   * ```ts
   * const stream = this.llmService.streamText({ prompt: 'Tell me a story' });
   * for await (const chunk of stream) {
   *   process.stdout.write(chunk.text);
   * }
   * ```
   */
  streamText(options: StreamGenerationOptions): AsyncGenerator<LlmResponse> {
    this.logger.debug('Delegating streamText to provider');
    return this.provider.streamText(options);
  }
}
