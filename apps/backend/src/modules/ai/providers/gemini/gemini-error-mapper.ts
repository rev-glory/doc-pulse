import { LlmErrorMapper, MapErrorOptions } from '../../errors/llm-error-mapper.interface';
import { LlmException } from '../../errors/llm-exception';
import { LlmErrorCode } from '../../errors/llm-error-code';

export class GeminiErrorMapper implements LlmErrorMapper {
  public mapError(options: MapErrorOptions): LlmException {
    const { operation, error, model = 'unknown-gemini-model' } = options;
    const providerName = 'Gemini';

    let message = '';
    let status: number | undefined = undefined;

    if (error && typeof error === 'object') {
      // 1. Resolve HTTP/SDK Status code if present
      if ('status' in error) {
        const val = (error as any).status;
        if (typeof val === 'number') {
          status = val;
        } else if (typeof val === 'string' && !isNaN(Number(val))) {
          status = Number(val);
        }
      } else if ('statusCode' in error) {
        status = Number((error as any).statusCode);
      } else if ('status' in ((error as any).response || {})) {
        status = Number((error as any).response?.status);
      } else if ('code' in error) {
        const val = (error as any).code;
        if (typeof val === 'number') {
          status = val;
        }
      }

      // 2. Resolve Message
      if ('message' in error) {
        message = String((error as any).message);
      }
    } else {
      message = String(error);
    }

    const lowerMsg = message.toLowerCase();
    let code = LlmErrorCode.UNKNOWN;

    // 3. Status Code Priorty
    if (status === 401) {
      code = LlmErrorCode.INVALID_API_KEY;
    } else if (status === 403) {
      code = LlmErrorCode.EXPIRED_API_KEY;
    } else if (status === 404) {
      code = LlmErrorCode.INVALID_MODEL;
    } else if (status === 429) {
      code = LlmErrorCode.RATE_LIMITED;
    } else if (status && status >= 500 && status < 600) {
      code = LlmErrorCode.PROVIDER_UNAVAILABLE;
    }
    // 4. Fallback String Matching
    else if (
      lowerMsg.includes('api key') ||
      lowerMsg.includes('apikey') ||
      lowerMsg.includes('unauthorized') ||
      lowerMsg.includes('invalid credentials')
    ) {
      code = LlmErrorCode.INVALID_API_KEY;
    } else if (
      lowerMsg.includes('quota') ||
      lowerMsg.includes('exhausted') ||
      lowerMsg.includes('resource_exhausted') ||
      lowerMsg.includes('limit exceeded')
    ) {
      code = LlmErrorCode.QUOTA_EXCEEDED;
    } else if (
      lowerMsg.includes('rate limit') ||
      lowerMsg.includes('too many requests') ||
      lowerMsg.includes('429')
    ) {
      code = LlmErrorCode.RATE_LIMITED;
    } else if (
      lowerMsg.includes('model') &&
      (lowerMsg.includes('not found') || lowerMsg.includes('invalid'))
    ) {
      code = LlmErrorCode.INVALID_MODEL;
    } else if (
      lowerMsg.includes('context length') ||
      lowerMsg.includes('context window') ||
      lowerMsg.includes('too many tokens') ||
      lowerMsg.includes('token limit exceeded')
    ) {
      code = LlmErrorCode.CONTEXT_WINDOW_EXCEEDED;
    } else if (
      lowerMsg.includes('overloaded') ||
      lowerMsg.includes('unavailable') ||
      lowerMsg.includes('service unavailable') ||
      lowerMsg.includes('outage') ||
      lowerMsg.includes('500') ||
      lowerMsg.includes('503') ||
      lowerMsg.includes('internal error')
    ) {
      code = LlmErrorCode.PROVIDER_UNAVAILABLE;
    } else if (
      lowerMsg.includes('network') ||
      lowerMsg.includes('socket') ||
      lowerMsg.includes('hang up') ||
      lowerMsg.includes('timeout') ||
      lowerMsg.includes('connreset') ||
      lowerMsg.includes('dns')
    ) {
      code = LlmErrorCode.NETWORK_ERROR;
    }

    const cleanMsg = `LLM provider [${providerName}] error during [${operation}] using model [${model}]: ${message}`;

    return new LlmException(
      code,
      cleanMsg,
      { provider: providerName, model },
      operation,
      status,
      error,
    );
  }
}
