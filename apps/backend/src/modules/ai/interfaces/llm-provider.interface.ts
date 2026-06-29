import { LlmException } from "../errors/llm-exception";
import type {
  GenerationOptions,
  LlmResponse,
  StreamGenerationOptions,
  StructuredGenerationOptions,
} from "../types/llm.types";

export interface LlmProviderDescriptor {
  id: string;
  displayName: string;
  supportsStreaming: boolean;
  supportsStructuredOutput: boolean;
  supportsVision: boolean;
}

// ---------------------------------------------------------------------------
// ILlmProvider
//
// The contract every LLM provider must satisfy.
//
// Design rationale:
//   LlmService depends on this interface, not on any concrete class.
//   This is the Dependency Inversion Principle in practice.
//
//   To add a new provider (OpenAI, Anthropic, Ollama, etc.):
//     1. Create a class that implements ILlmProvider.
//     2. Register it in AiModule under the LLM_PROVIDER token.
//     3. Zero changes to LlmService or any consumer.
// ---------------------------------------------------------------------------

export interface ILlmProvider {
  readonly descriptor: LlmProviderDescriptor;
  readonly model: string;
  /**
   * Generate a plain-text response for the given prompt.
   *
   * @param options - Generation parameters including the prompt text.
   * @returns Normalised LLM response containing the generated text and usage.
   * @throws {LlmException} When the underlying SDK call fails.
   */
  generateText(options: GenerationOptions): Promise<LlmResponse>;

  /**
   * Generate a structured (JSON) response that conforms to the provided schema.
   *
   * The provider is responsible for enabling JSON mode and applying the schema
   * in the SDK-specific way. Consumers always receive a typed `LlmResponse`
   * whose `text` field contains a valid JSON string.
   *
   * @param options - Generation parameters including the response schema.
   * @returns Normalised LLM response where `text` is a JSON string.
   * @throws {LlmException} When the underlying SDK call fails.
   */
  generateStructured(
    options: StructuredGenerationOptions,
  ): Promise<LlmResponse>;

  /**
   * Stream a text response as an async generator of partial chunks.
   *
   * Each yielded chunk is a `LlmResponse` whose `text` field contains a
   * partial text delta (not the accumulated full text). Consumers must
   * concatenate chunks if they need the full response.
   *
   * @param options - Generation parameters including the prompt text.
   * @returns Async generator yielding incremental response chunks.
   * @throws {LlmException} When the underlying SDK call fails.
   */
  streamText(options: StreamGenerationOptions): AsyncGenerator<LlmResponse>;
}
