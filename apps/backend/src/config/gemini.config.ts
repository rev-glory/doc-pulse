import { registerAs } from "@nestjs/config";

import type { Env } from "./env.validation";

// ---------------------------------------------------------------------------
// Gemini Configuration
//
// Registered under the 'gemini' namespace.
// Inject with: ConfigService.get<GeminiConfig>('gemini')
//
// Consumed by:
//   • GeminiProvider (AI module)
//
// Design note:
//   Separated from ai.config.ts (OpenAI/Anthropic) to keep each provider's
//   config independent. Adding a new provider means adding a new config file,
//   not modifying an existing one (Open/Closed Principle).
// ---------------------------------------------------------------------------

export interface GeminiConfig {
  /** Gemini API key from Google AI Studio. Required. */
  apiKey: string;

  /**
   * Gemini model to use for generation calls.
   * Defaults to 'gemini-2.0-flash'.
   *
   * Examples: 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-lite'
   */
  model: string;

  /**
   * Default sampling temperature applied when not overridden per-call.
   * 0.0 = deterministic, 1.0 = balanced, higher = more creative.
   */
  temperature: number;
}

export const geminiConfig = registerAs("gemini", (): GeminiConfig => {
  const env = process.env as unknown as Env;

  return {
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
    temperature: Number(env.GEMINI_TEMPERATURE),
  };
});
