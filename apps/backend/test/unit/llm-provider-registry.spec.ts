import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LlmProviderRegistry } from '../../src/modules/ai/registry/llm-provider.registry';
import { GeminiProvider } from '../../src/modules/ai/providers/gemini/gemini.provider';
import { OpenAIProvider } from '../../src/modules/ai/providers/openai/openai-placeholder.provider';
import { AnthropicProvider } from '../../src/modules/ai/providers/anthropic/anthropic-placeholder.provider';
import { LlmService } from '../../src/modules/ai/services/llm.service';
import { LlmException } from '../../src/modules/ai/errors/llm-exception';

describe('LlmProviderRegistry & Multi-LLM Architecture Tests', () => {
  const mockConfigService = {
    get: (key: string) => {
      if (key === 'DEFAULT_LLM_PROVIDER') return 'gemini';
      if (key === 'gemini') return { apiKey: 'mock-key', model: 'gemini-2.0-flash', temperature: 0.2 };
      return null;
    },
  } as any;

  const createRegistry = (providersList: any[]) => {
    return new LlmProviderRegistry(providersList, mockConfigService);
  };

  it('should initialize registry and register all placeholder + gemini providers', () => {
    const gemini = new GeminiProvider(mockConfigService);
    gemini.onModuleInit();

    const openai = new OpenAIProvider();
    const anthropic = new AnthropicProvider();

    const registry = createRegistry([gemini, openai, anthropic]);
    registry.onModuleInit();

    const providers = registry.getAll();
    assert.equal(providers.length, 3);

    const ids = providers.map((p) => p.descriptor.id);
    assert.ok(ids.includes('gemini'));
    assert.ok(ids.includes('openai'));
    assert.ok(ids.includes('anthropic'));
  });

  it('should resolve default provider (Gemini) correctly from config', () => {
    const gemini = new GeminiProvider(mockConfigService);
    gemini.onModuleInit();

    const registry = createRegistry([gemini, new OpenAIProvider(), new AnthropicProvider()]);
    registry.onModuleInit();

    const defaultProvider = registry.getDefault();
    assert.ok(defaultProvider);
    assert.equal(defaultProvider.descriptor.id, 'gemini');
  });

  it('should resolve specific providers by ID', () => {
    const gemini = new GeminiProvider(mockConfigService);
    gemini.onModuleInit();

    const registry = createRegistry([gemini, new OpenAIProvider(), new AnthropicProvider()]);
    registry.onModuleInit();

    const openai = registry.get('openai');
    assert.equal(openai.descriptor.id, 'openai');
    assert.equal(openai.descriptor.displayName, 'OpenAI');

    const anthropic = registry.get('anthropic');
    assert.equal(anthropic.descriptor.id, 'anthropic');
  });

  it('should throw error when lookup for unknown provider is requested', () => {
    const gemini = new GeminiProvider(mockConfigService);
    gemini.onModuleInit();

    const registry = createRegistry([gemini]);
    registry.onModuleInit();

    assert.throws(
      () => registry.get('unknown-provider'),
      /Unknown LLM provider requested: unknown-provider/
    );
  });

  it('should throw startup error on duplicate provider registrations', () => {
    const gemini1 = new GeminiProvider(mockConfigService);
    const gemini2 = new GeminiProvider(mockConfigService);
    gemini1.onModuleInit();
    gemini2.onModuleInit();

    const registry = createRegistry([gemini1, gemini2]);
    assert.throws(
      () => registry.onModuleInit(),
      /Duplicate LLM provider registration detected: gemini/
    );
  });

  it('should throw startup error if DEFAULT_LLM_PROVIDER config is unregistered/unknown', () => {
    const brokenConfigService = {
      get: (key: string) => {
        if (key === 'DEFAULT_LLM_PROVIDER') return 'unknown-provider';
        return null;
      },
    } as any;

    const registry = new LlmProviderRegistry([new OpenAIProvider(), new AnthropicProvider()], brokenConfigService);
    assert.throws(
      () => registry.onModuleInit(),
      /Unknown DEFAULT_LLM_PROVIDER configured: unknown-provider/
    );
  });

  it('should throw LlmException with nested NotImplementedException on placeholder providers calls', async () => {
    const openai = new OpenAIProvider();

    await assert.rejects(
      async () => {
        await openai.generateText({ prompt: 'test' });
      },
      (err: any) => {
        assert.ok(err instanceof LlmException);
        assert.equal(err.message, 'OpenAI provider is not implemented yet.');
        assert.equal(err.originalCause.message, 'NotImplementedException');
        return true;
      }
    );
  });

  it('LlmService should delegate execution to resolved default provider', async () => {
    const mockGemini = {
      descriptor: { id: 'gemini', displayName: 'Gemini' },
      model: 'gemini-2.0-flash',
      generateText: async (opts: any) => {
        assert.equal(opts.prompt, 'test-prompt');
        return { text: 'mock-response' };
      },
    };

    const mockRegistry = {
      getDefault: () => mockGemini,
    } as any;

    const mockRetryPolicy = {
      execute: async (opName: string, fn: any) => fn(),
    } as any;

    const service = new LlmService(mockRegistry, mockRetryPolicy);
    const res = await service.generateText({ prompt: 'test-prompt' });

    assert.equal(res.text, 'mock-response');
  });
});
