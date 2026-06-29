import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LlmErrorCode } from "../../src/modules/ai/errors/llm-error-code";
import {
  LlmException,
  isLlmException,
} from "../../src/modules/ai/errors/llm-exception";
import { GeminiErrorMapper } from "../../src/modules/ai/providers/gemini/gemini-error-mapper";
import { RetryPolicyService } from "../../src/modules/ai/services/retry-policy.service";
import {
  classifyWorkflowError,
  QueueErrorClassification,
} from "../../src/modules/queue/types/queue-errors";

describe("Unified LLM Error Handling Spec", () => {
  const mapper = new GeminiErrorMapper();
  const retryPolicy = new RetryPolicyService();

  describe("GeminiErrorMapper", () => {
    it("should map HTTP status 401 to INVALID_API_KEY (non-retryable)", () => {
      const exception = mapper.mapError({
        operation: "generateText",
        error: { status: 401, message: "Invalid API key provided" },
        model: "gemini-2.0-flash",
      });

      assert.ok(isLlmException(exception));
      assert.equal(exception.code, LlmErrorCode.INVALID_API_KEY);
      assert.equal(exception.retryable, false);
      assert.equal(exception.providerStatus, 401);
      assert.equal(exception.provider.provider, "Gemini");
      assert.equal(exception.provider.model, "gemini-2.0-flash");
      assert.equal(exception.operation, "generateText");
    });

    it("should map HTTP status 429 to RATE_LIMITED (retryable)", () => {
      const exception = mapper.mapError({
        operation: "generateStructured",
        error: { status: 429, message: "Resource exhausted" },
      });

      assert.equal(exception.code, LlmErrorCode.RATE_LIMITED);
      assert.equal(exception.retryable, true);
      assert.equal(exception.providerStatus, 429);
    });

    it('should fall back to string matching "quota exceeded" -> QUOTA_EXCEEDED (non-retryable)', () => {
      const exception = mapper.mapError({
        operation: "generateText",
        error: new Error("Google Gen AI API quota exceeded for this project"),
      });

      assert.equal(exception.code, LlmErrorCode.QUOTA_EXCEEDED);
      assert.equal(exception.retryable, false);
    });

    it("should map HTTP status 503 to PROVIDER_UNAVAILABLE (retryable)", () => {
      const exception = mapper.mapError({
        operation: "generateText",
        error: { status: 503, message: "Service Unavailable" },
      });

      assert.equal(exception.code, LlmErrorCode.PROVIDER_UNAVAILABLE);
      assert.equal(exception.retryable, true);
    });
  });

  describe("RetryPolicyService integration", () => {
    it("should execute successfully if provider does not fail", async () => {
      const mockOp = async () => "success-text";
      const result = await retryPolicy.execute("test-op", mockOp);

      assert.equal(result, "success-text");
    });

    it("should immediately propagate permanent LlmExceptions without retrying", async () => {
      const permanentError = new LlmException(
        LlmErrorCode.INVALID_API_KEY,
        "Invalid key",
        { provider: "Gemini", model: "gemini-2.0-flash" },
        "generateText",
        401,
      );

      let callCount = 0;
      const mockOp = async () => {
        callCount++;
        throw permanentError;
      };

      await assert.rejects(
        async () => {
          await retryPolicy.execute("test-op", mockOp, { maxAttempts: 3 });
        },
        (err: any) => {
          assert.ok(isLlmException(err));
          assert.equal(err.code, LlmErrorCode.INVALID_API_KEY);
          return true;
        },
      );
      assert.equal(callCount, 1);
    });

    it("should retry transient retryable LlmExceptions and succeed on subsequent attempts", async () => {
      const providerUnavailableError = new LlmException(
        LlmErrorCode.PROVIDER_UNAVAILABLE,
        "Service Unavailable",
        { provider: "Gemini", model: "gemini-2.0-flash" },
        "generateText",
        503,
      );

      let attempts = 0;
      const mockOp = async () => {
        attempts++;
        if (attempts < 2) {
          throw providerUnavailableError;
        }
        return "retry-success";
      };

      const result = await retryPolicy.execute("test-op", mockOp, {
        maxAttempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
      });

      assert.equal(result, "retry-success");
      assert.equal(attempts, 2);
    });
  });

  describe("Queue classifyWorkflowError Integration", () => {
    it("should classify transient LlmExceptions as TRANSIENT", () => {
      const rateLimitError = new LlmException(
        LlmErrorCode.RATE_LIMITED,
        "Too many requests",
        { provider: "Gemini", model: "gemini-2.0-flash" },
        "generateText",
        429,
      );

      const classification = classifyWorkflowError(rateLimitError);
      assert.equal(classification, QueueErrorClassification.TRANSIENT);
    });

    it("should classify permanent LlmExceptions as PERMANENT", () => {
      const modelError = new LlmException(
        LlmErrorCode.INVALID_MODEL,
        "Model not found",
        { provider: "Gemini", model: "invalid" },
        "generateText",
        404,
      );

      const classification = classifyWorkflowError(modelError);
      assert.equal(classification, QueueErrorClassification.PERMANENT);
    });
  });
});
