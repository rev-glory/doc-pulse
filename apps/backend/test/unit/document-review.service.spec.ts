import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ConfigService } from "@nestjs/config";
import { DocumentReviewService } from "../../src/modules/document-review/services/document-review.service";
import { ReviewEvaluatorService } from "../../src/modules/document-review/services/review-evaluator.service";
import { OutputParserService } from "../../src/modules/document-generation/services/output-parser.service";
import { MarkdownValidatorService } from "../../src/modules/document-generation/services/markdown-validator.service";
import { GeneratedDocumentType } from "../../src/domain/workflow";

describe("DocumentReviewService Orchestrator Unit Tests", () => {
  const mockContextBuilder = {
    buildContext: async () => ({
      repositoryName: "test-repo",
      formattedSummary: "summary",
    }),
  } as any;

  const mockPromptBuilder = {
    buildCriticPrompt: async () => ({
      systemPrompt: "sys",
      userPrompt: "usr",
      responseSchema: {},
    }),
    buildBatchCriticPrompt: async () => ({
      systemPrompt: "sys",
      userPrompt: "usr",
      responseSchema: {},
    }),
  } as any;

  const mockOutputParser = new OutputParserService();
  const mockValidator = new MarkdownValidatorService();
  const mockEvaluator = new ReviewEvaluatorService({ get: () => 85 } as any);

  const dummyRepository = { name: "test-repo" } as any;
  const dummyInventory = { documentationFiles: [] } as any;

  it("should successfully handle partial missing document evaluations in batch response", async () => {
    const mockLlmService = {
      generateStructured: async () => {
        return {
          text: JSON.stringify({
            reviews: [
              {
                documentType: "API",
                score: 90,
                issues: [],
                suggestions: ["Good doc"],
              },
            ],
          }),
          metadata: {
            model: "gemini-2.5-flash",
            promptTokens: 5,
            completionTokens: 5,
            totalTokens: 10,
          },
        };
      },
    } as any;

    const service = new DocumentReviewService(
      mockContextBuilder,
      mockPromptBuilder,
      mockLlmService,
      mockOutputParser,
      mockValidator,
      mockEvaluator,
      { get: () => "gemini-2.5-flash" } as any,
    );

    const docs = [
      { type: GeneratedDocumentType.README, markdown: "# README\nContent" },
      { type: GeneratedDocumentType.API, markdown: "# API\nContent" },
    ] as any[];

    const result = await service.reviewDocuments(
      dummyRepository,
      dummyInventory,
      docs,
      "test-run",
    );

    assert.equal(result.totalDocuments, 2);
    assert.equal(result.approvedCount, 1);
    assert.equal(result.failedCount, 1);
    assert.equal(result.passed, false);
    assert.equal(result.reviews?.length, 2);

    // First doc failed (missing in batch response)
    assert.equal(result.reviews[0]?.approved, false);
    assert.equal(result.reviews[0]?.issues[0]?.category, "System Error");

    // Second doc passed
    assert.equal(result.reviews[1]?.approved, true);
    assert.equal(result.reviews[1]?.score, 90);
  });
});
