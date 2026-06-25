// ---------------------------------------------------------------------------
// AI Module — Injection Tokens
//
// Using a string-based injection token (rather than a class) decouples the
// consumer from the concrete provider implementation.
//
// Usage:
//   @Inject(LLM_PROVIDER) private readonly provider: ILlmProvider
//
// This allows swapping GeminiProvider → OpenAIProvider → OllamaProvider
// without touching any service that consumes LlmService.
// ---------------------------------------------------------------------------

export const LLM_PROVIDER = 'LLM_PROVIDER' as const;
