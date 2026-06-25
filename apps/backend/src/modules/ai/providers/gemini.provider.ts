import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenAI,
  type GenerateContentConfig,
  type GenerateContentResponse,
} from '@google/genai';

import type { GeminiConfig } from '@/config';
import { AIConfigurationException } from '../exceptions/ai-configuration.exception';
import { AIProviderException } from '../exceptions/ai-provider.exception';
import type { ILlmProvider } from '../interfaces/llm-provider.interface';
import type {
  GenerationOptions,
  LlmResponse,
  StreamGenerationOptions,
  StructuredGenerationOptions,
} from '../types/llm.types';

// ---------------------------------------------------------------------------
// GeminiProvider
//
// The concrete ILlmProvider implementation backed by @google/genai v2 SDK.
//
// Responsibilities:
//   • Initialise and hold the GoogleGenAI client (one instance per lifecycle).
//   • Translate ILlmProvider method calls into SDK calls.
//   • Normalise SDK responses into LlmResponse.
//   • Wrap every SDK error in AIProviderException.
//
// This class is the ONLY place in the codebase that imports @google/genai.
// SDK types (GenerateContentConfig, GenerateContentResponse) are used only
// inside this file and never escape through the ILlmProvider interface.
// ---------------------------------------------------------------------------

@Injectable()
export class GeminiProvider implements ILlmProvider, OnModuleInit {
  private readonly logger = new Logger(GeminiProvider.name);

  /** Lazily initialised after config validation in onModuleInit. */
  private client!: GoogleGenAI;

  /** The model ID used for all generation calls (e.g. 'gemini-2.0-flash'). */
  private model!: string;

  constructor(private readonly configService: ConfigService) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Called by NestJS after the module is initialised.
   * Validates configuration and creates the SDK client instance.
   * Throws AIConfigurationException on any config problem so the app
   * refuses to start rather than failing silently at runtime.
   */
  onModuleInit(): void {
    const config = this.configService.get<GeminiConfig>('gemini');

    if (!config) {
      throw new AIConfigurationException(
        'Gemini configuration is missing. Ensure GEMINI_API_KEY is set and the gemini config namespace is registered.',
      );
    }

    if (!config.apiKey) {
      throw new AIConfigurationException(
        'GEMINI_API_KEY is not set. Cannot initialise GeminiProvider.',
      );
    }

    this.model = config.model;
    this.client = new GoogleGenAI({ apiKey: config.apiKey });

    this.logger.log(`GeminiProvider initialised with model: ${this.model}`);
  }

  // ── ILlmProvider ─────────────────────────────────────────────────────────

  /**
   * Generate a plain-text response.
   */
  async generateText(options: GenerationOptions): Promise<LlmResponse> {
    this.logger.debug(`generateText: model=${this.model}`);

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: options.prompt,
        config: this.buildConfig(options),
      });

      return this.normaliseResponse(response);
    } catch (error) {
      throw this.wrapError('generateText', error);
    }
  }

  /**
   * Generate a structured JSON response using Gemini's JSON mode.
   *
   * The SDK sends `responseMimeType: 'application/json'` and `responseSchema`
   * to instruct the model to return valid JSON conforming to the given schema.
   */
  async generateStructured(options: StructuredGenerationOptions): Promise<LlmResponse> {
    this.logger.debug(`generateStructured: model=${this.model}`);

    try {
      const config: GenerateContentConfig = {
        ...this.buildConfig(options),
        responseMimeType: 'application/json',
        // SchemaUnion = Schema | unknown. Our plain JSON Schema object satisfies
        // the 'unknown' member of that union, so the cast is safe and intentional.
        responseSchema: options.responseSchema as unknown,
      };

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: options.prompt,
        config,
      });

      return this.normaliseResponse(response);
    } catch (error) {
      throw this.wrapError('generateStructured', error);
    }
  }

  /**
   * Stream a text response as an async generator of partial chunks.
   *
   * Each yielded LlmResponse.text is a delta, not the accumulated full text.
   */
  async *streamText(options: StreamGenerationOptions): AsyncGenerator<LlmResponse> {
    this.logger.debug(`streamText: model=${this.model}`);

    let stream: AsyncGenerator<GenerateContentResponse>;

    try {
      stream = await this.client.models.generateContentStream({
        model: this.model,
        contents: options.prompt,
        config: this.buildConfig(options),
      });
    } catch (error) {
      throw this.wrapError('streamText (init)', error);
    }

    for await (const chunk of stream) {
      try {
        yield this.normaliseResponse(chunk);
      } catch (error) {
        throw this.wrapError('streamText (chunk)', error);
      }
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Build a GenerateContentConfig from provider-agnostic options.
   * Only sets fields that are explicitly provided to avoid overriding SDK defaults.
   */
  private buildConfig(options: GenerationOptions): GenerateContentConfig {
    const config: GenerateContentConfig = {};

    if (options.systemInstruction !== undefined) {
      config.systemInstruction = options.systemInstruction;
    }

    if (options.temperature !== undefined) {
      config.temperature = options.temperature;
    }

    if (options.maxOutputTokens !== undefined) {
      config.maxOutputTokens = options.maxOutputTokens;
    }

    return config;
  }

  /**
   * Normalise a Gemini SDK response to our domain LlmResponse type.
   * Throws AIProviderException if the response has no text (blocked prompt,
   * empty candidates, etc.).
   */
  private normaliseResponse(response: GenerateContentResponse): LlmResponse {
    const text = response.text;

    if (text === undefined || text === null) {
      throw new AIProviderException(
        'Gemini returned an empty response. The prompt may have been blocked by safety filters.',
      );
    }

    const usage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount ?? 0,
          completionTokens: response.usageMetadata.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata.totalTokenCount ?? 0,
        }
      : undefined;

    return { text, usage };
  }

  /**
   * Wraps any caught error in AIProviderException.
   * Returns (not throws) so callers can `throw this.wrapError(...)` and
   * TypeScript knows the throw is guaranteed.
   */
  private wrapError(operation: string, cause: unknown): AIProviderException {
    const message =
      cause instanceof Error
        ? `Gemini API error during ${operation}: ${cause.message}`
        : `Gemini API error during ${operation}: unknown error`;

    this.logger.error(message, cause instanceof Error ? cause.stack : undefined);

    return new AIProviderException(message, cause);
  }
}
