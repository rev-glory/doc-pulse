import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { geminiConfig } from '@/config';
import { GeminiProvider } from './providers/gemini/gemini.provider';
import { OpenAIProvider } from './providers/openai/openai-placeholder.provider';
import { AnthropicProvider } from './providers/anthropic/anthropic-placeholder.provider';
import { LlmProviderRegistry, LLM_PROVIDERS } from './registry/llm-provider.registry';
import { LlmService } from './services/llm.service';

// ---------------------------------------------------------------------------
// AiModule
//
// Self-contained NestJS module that wires the AI infrastructure.
// ---------------------------------------------------------------------------

import { PromptTemplateService } from './services/prompt-template.service';
import { RetryPolicyService } from './services/retry-policy.service';

@Module({
  imports: [
    ConfigModule.forFeature(geminiConfig),
  ],
  providers: [
    GeminiProvider,
    OpenAIProvider,
    AnthropicProvider,
    {
      provide: LLM_PROVIDERS,
      useFactory: (gemini: GeminiProvider, openai: OpenAIProvider, anthropic: AnthropicProvider) => [
        gemini,
        openai,
        anthropic,
      ],
      inject: [GeminiProvider, OpenAIProvider, AnthropicProvider],
    },
    LlmProviderRegistry,
    RetryPolicyService,
    LlmService,
    PromptTemplateService,
  ],
  exports: [
    RetryPolicyService,
    LlmService,
    PromptTemplateService,
    LlmProviderRegistry,
  ],
})
export class AiModule {}
