import { Injectable } from '@nestjs/common';
import { LlmErrorCode } from '../../errors/llm-error-code';
import { LlmException } from '../../errors/llm-exception';
import type { ILlmProvider, LlmProviderDescriptor } from '../../interfaces/llm-provider.interface';
import type {
  GenerationOptions,
  LlmResponse,
  StreamGenerationOptions,
  StructuredGenerationOptions,
} from '../../types/llm.types';

@Injectable()
export class OpenAIProvider implements ILlmProvider {
  public readonly descriptor: LlmProviderDescriptor = {
    id: 'openai',
    displayName: 'OpenAI',
    supportsStreaming: true,
    supportsStructuredOutput: true,
    supportsVision: false,
  };

  public readonly model: string = 'gpt-4o';

  public async generateText(options: GenerationOptions): Promise<LlmResponse> {
    throw new LlmException(
      LlmErrorCode.UNKNOWN,
      'OpenAI provider is not implemented yet.',
      { provider: 'OpenAI', model: 'placeholder' },
      'generateText',
      undefined,
      new Error('NotImplementedException'),
    );
  }

  public async generateStructured(options: StructuredGenerationOptions): Promise<LlmResponse> {
    throw new LlmException(
      LlmErrorCode.UNKNOWN,
      'OpenAI provider is not implemented yet.',
      { provider: 'OpenAI', model: 'placeholder' },
      'generateStructured',
      undefined,
      new Error('NotImplementedException'),
    );
  }

  public async *streamText(options: StreamGenerationOptions): AsyncGenerator<LlmResponse> {
    throw new LlmException(
      LlmErrorCode.UNKNOWN,
      'OpenAI provider is not implemented yet.',
      { provider: 'OpenAI', model: 'placeholder' },
      'streamText',
      undefined,
      new Error('NotImplementedException'),
    );
  }
}
