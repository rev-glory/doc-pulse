import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ConfigService } from "@nestjs/config";
import { ReviewEvaluatorService } from "../../src/modules/document-review/services/review-evaluator.service";
import {
  GeneratedDocumentType,
  ReviewMetrics,
} from "../../src/domain/workflow";

describe("ReviewEvaluatorService Unit Tests", () => {
  const mockConfig = {
    get: (_key: string, defaultVal: number) => 85,
  } as ConfigService;

  const evaluator = new ReviewEvaluatorService(mockConfig);
  const docType = GeneratedDocumentType.README;
  const dummyMetrics: ReviewMetrics = {
    promptVersion: 1,
    model: "gemini-2.5-flash",
    reviewDurationMs: 50,
    promptTokens: 10,
    completionTokens: 10,
    totalTokens: 20,
    reviewedAt: new Date().toISOString(),
  };

  it("should approve document when score is exactly 85 and markdown is valid (threshold edge case 85)", () => {
    const raw = { score: 85, issues: [], suggestions: ["Keep it up"] };
    const validation = { valid: true, warnings: [], errors: [] };

    const review = evaluator.evaluate(raw, validation, docType, dummyMetrics);
    assert.equal(review.score, 85);
    assert.equal(review.approved, true);
  });

  it("should approve document when score is 86 (threshold edge case 86)", () => {
    const raw = { score: 86, issues: [], suggestions: [] };
    const validation = { valid: true, warnings: [], errors: [] };

    const review = evaluator.evaluate(raw, validation, docType, dummyMetrics);
    assert.equal(review.score, 86);
    assert.equal(review.approved, true);
  });

  it("should reject document when score is 84 (threshold edge case 84)", () => {
    const raw = { score: 84, issues: [], suggestions: [] };
    const validation = { valid: true, warnings: [], errors: [] };

    const review = evaluator.evaluate(raw, validation, docType, dummyMetrics);
    assert.equal(review.score, 84);
    assert.equal(review.approved, false);
  });

  it("should apply markdown validation penalties and reject document if errors drop score below threshold", () => {
    const raw = { score: 95, issues: [], suggestions: [] };
    const validation = {
      valid: false,
      warnings: [{ message: "Minor warning" }], // -2
      errors: [{ message: "Syntax error" }], // -15
    };

    // 95 - 15 - 2 = 78
    const review = evaluator.evaluate(raw, validation, docType, dummyMetrics);
    assert.equal(review.score, 78);
    assert.equal(review.approved, false);
    assert.equal(review.issues.length, 2);
    assert.equal(review.issues[0]?.severity, "CRITICAL");
  });

  it("should correctly aggregate multiple reviews into consolidated CriticReview", () => {
    const rev1 = evaluator.evaluate(
      { score: 90, issues: [], suggestions: ["sug1"] },
      { valid: true, warnings: [], errors: [] },
      GeneratedDocumentType.README,
      dummyMetrics,
    );
    const rev2 = evaluator.evaluate(
      { score: 70, issues: [], suggestions: ["sug2"] },
      { valid: true, warnings: [], errors: [] },
      GeneratedDocumentType.API,
      dummyMetrics,
    );

    const agg = evaluator.aggregate([rev1, rev2]);
    assert.equal(agg.score, 80); // (90 + 70) / 2
    assert.equal(agg.approvedCount, 1);
    assert.equal(agg.failedCount, 1);
    assert.equal(agg.totalDocuments, 2);
    assert.equal(agg.passed, false);
    assert.equal(agg.suggestions.length, 2);
  });
});
