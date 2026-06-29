import { Injectable } from "@nestjs/common";
import { LlmErrorCode } from "../../errors/llm-error-code";
import { LlmException } from "../../errors/llm-exception";
import type {
  ILlmProvider,
  LlmProviderDescriptor,
} from "../../interfaces/llm-provider.interface";
import type {
  GenerationOptions,
  LlmResponse,
  StreamGenerationOptions,
  StructuredGenerationOptions,
} from "../../types/llm.types";

@Injectable()
export class AnthropicProvider implements ILlmProvider {
  public readonly descriptor: LlmProviderDescriptor = {
    id: "anthropic",
    displayName: "Anthropic",
    supportsStreaming: true,
    supportsStructuredOutput: true,
    supportsVision: false,
  };

  public readonly model: string = "claude-3-5-sonnet-latest";

  public async generateText(options: GenerationOptions): Promise<LlmResponse> {
    throw new LlmException(
      LlmErrorCode.UNKNOWN,
      "Anthropic provider is not implemented yet.",
      { provider: "Anthropic", model: "placeholder" },
      "generateText",
      undefined,
      new Error("NotImplementedException"),
    );
  }

  public async generateStructured(
    options: StructuredGenerationOptions,
  ): Promise<LlmResponse> {
    throw new LlmException(
      LlmErrorCode.UNKNOWN,
      "Anthropic provider is not implemented yet.",
      { provider: "Anthropic", model: "placeholder" },
      "generateStructured",
      undefined,
      new Error("NotImplementedException"),
    );
  }

  public async *streamText(
    options: StreamGenerationOptions,
  ): AsyncGenerator<LlmResponse> {
    throw new LlmException(
      LlmErrorCode.UNKNOWN,
      "Anthropic provider is not implemented yet.",
      { provider: "Anthropic", model: "placeholder" },
      "streamText",
      undefined,
      new Error("NotImplementedException"),
    );
  }
}
