// ---------------------------------------------------------------------------
// AI Module — Shared LLM Types
//
// All types used across the AI module are defined here.
// No 'any'. No unsafe casts.
//
// Consumers of LlmService import only from this file, never from SDK types,
// which ensures we can swap providers without touching call sites.
// ---------------------------------------------------------------------------

// ── Input Options ────────────────────────────────────────────────────────────

/**
 * Base options shared by every generation method.
 */
export interface GenerationOptions {
  /** The prompt text to send to the model. */
  prompt: string;

  /**
   * Optional system-level instruction that frames how the model should behave.
   * Mapped to `systemInstruction` in the Gemini SDK.
   */
  systemInstruction?: string;

  /**
   * Sampling temperature.
   * 0.0 = deterministic, higher values = more creative.
   * Defaults to the value in `GeminiConfig.temperature`.
   */
  temperature?: number;

  /**
   * Maximum number of output tokens.
   * Leave unset to use the model's default limit.
   */
  maxOutputTokens?: number;

  /**
   * Optional AbortSignal to cancel in-flight API calls and retry loops.
   */
  signal?: AbortSignal;
}

/**
 * Options for structured (JSON-mode) generation.
 * The provider sets `responseMimeType: 'application/json'`
 * and uses `responseSchema` to enforce the shape.
 */
export interface StructuredGenerationOptions extends GenerationOptions {
  /**
   * JSON Schema describing the expected response structure.
   * The Gemini SDK validates the model output against this schema.
   *
   * Use a plain object that conforms to OpenAPI 3.0 schema subset.
   * Do NOT use Zod schemas here — keep this layer SDK-agnostic.
   */
  responseSchema: Record<string, unknown>;
}

/**
 * Options for streaming text generation.
 * Identical to base options — streaming is a delivery mechanism, not a
 * separate generation mode.
 */
export type StreamGenerationOptions = GenerationOptions;

// ── Output Types ─────────────────────────────────────────────────────────────

/**
 * Normalised response returned by every LlmService method.
 *
 * SDK-specific fields (candidates, usageMetadata, etc.) are intentionally
 * omitted. If a consumer needs raw SDK data it should not go through
 * LlmService — it should be a specialised provider method instead.
 */
export interface LlmResponse {
  /** The generated text content. */
  text: string;

  /**
   * Usage statistics for the request.
   * Optional because the SDK may not always return them (e.g., cached calls).
   */
  usage?: LlmUsage;
}

/**
 * Token usage statistics.
 */
export interface LlmUsage {
  /** Number of tokens in the prompt (input). */
  promptTokens: number;

  /** Number of tokens in the generated response (output). */
  completionTokens: number;

  /** Total tokens consumed (prompt + completion). */
  totalTokens: number;
}
