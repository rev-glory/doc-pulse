import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { geminiConfig } from '@/config';
import { LLM_PROVIDER } from './constants/ai.constants';
import { GeminiProvider } from './providers/gemini.provider';
import { LlmService } from './services/llm.service';

// ---------------------------------------------------------------------------
// AiModule
//
// Self-contained NestJS module that wires the AI infrastructure.
//
// Provider wiring:
//   LLM_PROVIDER token → GeminiProvider
//
//   This is the only place where the concrete provider class appears.
//   Swap GeminiProvider for any other ILlmProvider implementation here
//   without changing a single line elsewhere.
//
// Exports:
//   LlmService — the only symbol other modules should import.
//
// Usage:
//   @Module({ imports: [AiModule] })
//   export class YourFeatureModule {}
// ---------------------------------------------------------------------------

import { PromptTemplateService } from './services/prompt-template.service';
import { RetryPolicyService } from './services/retry-policy.service';

@Module({
  imports: [
    ConfigModule.forFeature(geminiConfig),
  ],
  providers: [
    {
      provide: LLM_PROVIDER,
      useClass: GeminiProvider,
    },
    RetryPolicyService,
    LlmService,
    PromptTemplateService,
  ],
  exports: [
    RetryPolicyService,
    LlmService,
    PromptTemplateService,
  ],
})
export class AiModule {}
