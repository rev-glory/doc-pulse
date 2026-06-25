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

@Module({
  imports: [
    // Register the gemini config namespace so ConfigService.get('gemini')
    // resolves correctly inside this module and its providers.
    ConfigModule.forFeature(geminiConfig),
  ],
  providers: [
    // Bind the injection token to the concrete Gemini implementation.
    // To switch providers: replace GeminiProvider with any class that
    // implements ILlmProvider — zero other changes required.
    {
      provide: LLM_PROVIDER,
      useClass: GeminiProvider,
    },
    LlmService,
  ],
  exports: [
    // Export only LlmService.
    // Consumers must never depend on GeminiProvider or the LLM_PROVIDER token directly.
    LlmService,
  ],
})
export class AiModule {}
