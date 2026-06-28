import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenAI,
  type GenerateContentConfig,
  type GenerateContentResponse,
} from '@google/genai';

import type { GeminiConfig } from '@/config';
import { AIConfigurationException } from '../../exceptions/ai-configuration.exception';
import { LlmException } from '../../errors/llm-exception';
import { GeminiErrorMapper } from './gemini-error-mapper';
import type { ILlmProvider } from '../../interfaces/llm-provider.interface';
import type {
  GenerationOptions,
  LlmResponse,
  StreamGenerationOptions,
  StructuredGenerationOptions,
} from '../../types/llm.types';

@Injectable()
export class GeminiProvider implements ILlmProvider, OnModuleInit {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly mapper = new GeminiErrorMapper();

  /** Lazily initialised after config validation in onModuleInit. */
  private client!: GoogleGenAI;

  /** The model ID used for all generation calls (e.g. 'gemini-2.0-flash'). */
  private model!: string;

  constructor(private readonly configService: ConfigService) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

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

  async generateStructured(options: StructuredGenerationOptions): Promise<LlmResponse> {
    this.logger.debug(`generateStructured: model=${this.model}`);

    try {
      const config: GenerateContentConfig = {
        ...this.buildConfig(options),
        responseMimeType: 'application/json',
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

  private normaliseResponse(response: GenerateContentResponse): LlmResponse {
    const text = response.text;

    if (text === undefined || text === null) {
      throw this.wrapError(
        'normaliseResponse',
        new Error('Gemini returned an empty response. The prompt may have been blocked by safety filters.'),
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

  private wrapError(operation: string, cause: unknown): LlmException {
    return this.mapper.mapError({
      operation,
      error: cause,
      model: this.model,
    });
  }
}
