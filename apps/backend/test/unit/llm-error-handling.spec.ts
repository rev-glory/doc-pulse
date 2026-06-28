import { LlmErrorCode } from '../../src/modules/ai/errors/llm-error-code';
import { LlmException, isLlmException } from '../../src/modules/ai/errors/llm-exception';
import { GeminiErrorMapper } from '../../src/modules/ai/providers/gemini/gemini-error-mapper';
import { RetryPolicyService } from '../../src/modules/ai/services/retry-policy.service';
import { classifyWorkflowError, QueueErrorClassification } from '../../src/modules/queue/types/queue-errors';

describe('Unified LLM Error Handling Spec', () => {
  const mapper = new GeminiErrorMapper();
  const retryPolicy = new RetryPolicyService();

  describe('GeminiErrorMapper', () => {
    it('should map HTTP status 401 to INVALID_API_KEY (non-retryable)', () => {
      const exception = mapper.mapError({
        operation: 'generateText',
        error: { status: 401, message: 'Invalid API key provided' },
        model: 'gemini-2.0-flash',
      });

      expect(isLlmException(exception)).toBe(true);
      expect(exception.code).toBe(LlmErrorCode.INVALID_API_KEY);
      expect(exception.retryable).toBe(false);
      expect(exception.providerStatus).toBe(401);
      expect(exception.provider.provider).toBe('Gemini');
      expect(exception.provider.model).toBe('gemini-2.0-flash');
      expect(exception.operation).toBe('generateText');
    });

    it('should map HTTP status 429 to RATE_LIMITED (retryable)', () => {
      const exception = mapper.mapError({
        operation: 'generateStructured',
        error: { status: 429, message: 'Resource exhausted' },
      });

      expect(exception.code).toBe(LlmErrorCode.RATE_LIMITED);
      expect(exception.retryable).toBe(true);
      expect(exception.providerStatus).toBe(429);
    });

    it('should fall back to string matching "quota exceeded" -> QUOTA_EXCEEDED (non-retryable)', () => {
      const exception = mapper.mapError({
        operation: 'generateText',
        error: new Error('Google Gen AI API quota exceeded for this project'),
      });

      expect(exception.code).toBe(LlmErrorCode.QUOTA_EXCEEDED);
      expect(exception.retryable).toBe(false);
    });

    it('should map HTTP status 503 to PROVIDER_UNAVAILABLE (retryable)', () => {
      const exception = mapper.mapError({
        operation: 'generateText',
        error: { status: 503, message: 'Service Unavailable' },
      });

      expect(exception.code).toBe(LlmErrorCode.PROVIDER_UNAVAILABLE);
      expect(exception.retryable).toBe(true);
    });
  });

  describe('RetryPolicyService integration', () => {
    it('should execute successfully if provider does not fail', async () => {
      const mockOp = jest.fn().mockResolvedValue('success-text');
      const result = await retryPolicy.execute('test-op', mockOp);

      expect(result).toBe('success-text');
      expect(mockOp).toHaveBeenCalledTimes(1);
    });

    it('should immediately propagate permanent LlmExceptions without retrying', async () => {
      const permanentError = new LlmException(
        LlmErrorCode.INVALID_API_KEY,
        'Invalid key',
        { provider: 'Gemini', model: 'gemini-2.0-flash' },
        'generateText',
        401,
      );

      const mockOp = jest.fn().mockRejectedValue(permanentError);

      await expect(retryPolicy.execute('test-op', mockOp, { maxAttempts: 3 })).rejects.toThrow(
        LlmException,
      );
      expect(mockOp).toHaveBeenCalledTimes(1);
    });

    it('should retry transient retryable LlmExceptions and succeed on subsequent attempts', async () => {
      const rateLimitError = new LlmException(
        LlmErrorCode.RATE_LIMITED,
        'Too many requests',
        { provider: 'Gemini', model: 'gemini-2.0-flash' },
        'generateText',
        429,
      );

      let attempts = 0;
      const mockOp = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw rateLimitError;
        }
        return 'retry-success';
      });

      const result = await retryPolicy.execute('test-op', mockOp, {
        maxAttempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
      });

      expect(result).toBe('retry-success');
      expect(mockOp).toHaveBeenCalledTimes(2);
    });
  });

  describe('Queue classifyWorkflowError Integration', () => {
    it('should classify transient LlmExceptions as TRANSIENT', () => {
      const rateLimitError = new LlmException(
        LlmErrorCode.RATE_LIMITED,
        'Too many requests',
        { provider: 'Gemini', model: 'gemini-2.0-flash' },
        'generateText',
        429,
      );

      const classification = classifyWorkflowError(rateLimitError);
      expect(classification).toBe(QueueErrorClassification.TRANSIENT);
    });

    it('should classify permanent LlmExceptions as PERMANENT', () => {
      const modelError = new LlmException(
        LlmErrorCode.INVALID_MODEL,
        'Model not found',
        { provider: 'Gemini', model: 'invalid' },
        'generateText',
        404,
      );

      const classification = classifyWorkflowError(modelError);
      expect(classification).toBe(QueueErrorClassification.PERMANENT);
    });
  });
});
