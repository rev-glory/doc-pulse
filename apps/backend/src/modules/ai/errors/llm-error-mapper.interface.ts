import { LlmException } from "./llm-exception";

export interface MapErrorOptions {
  operation: string;
  error: unknown;
  model?: string;
}

export interface LlmErrorMapper {
  mapError(options: MapErrorOptions): LlmException;
}
