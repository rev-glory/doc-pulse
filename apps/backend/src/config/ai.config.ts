import { registerAs } from "@nestjs/config";

import type { Env } from "./env.validation";

// ---------------------------------------------------------------------------
// AI Configuration
//
// Registered under the 'ai' namespace.
// Inject with: ConfigService.get<AiConfig>('ai')
//
// Consumed by:
//   • LangGraph multi-agent workflow
//   • LangChain LLM client initialisation
//
// Design note:
//   Both OpenAI and Anthropic are configured here.
//   The active provider is selected by the workflow orchestrator — the config
//   layer does not make that decision.
// ---------------------------------------------------------------------------

export interface AiConfig {
  openai: {
    apiKey: string;
    model: string;
    temperature: number;
  };
  anthropic: {
    apiKey: string | undefined;
    model: string;
  };
}

export const aiConfig = registerAs("ai", (): AiConfig => {
  const env = process.env as unknown as Env;

  return {
    openai: {
      apiKey: env.OPENAI_API_KEY || "",
      model: env.OPENAI_MODEL,
      temperature: Number(env.OPENAI_TEMPERATURE),
    },
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.ANTHROPIC_MODEL,
    },
  };
});
