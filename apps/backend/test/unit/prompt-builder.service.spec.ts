import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PromptBuilderService } from "../../src/modules/document-generation/services/prompt-builder.service";
import { PromptTemplateService } from "../../src/modules/ai/services/prompt-template.service";
import { GeneratedDocumentType } from "../../src/domain/workflow";

describe("PromptBuilderService Unit Tests", () => {
  const templateService = new PromptTemplateService();
  const promptBuilder = new PromptBuilderService(templateService);

  it("should assemble system and user prompt attaching versioning and guidelines", async () => {
    const mockContext = {
      repositoryName: "test-repo",
      formattedSummary: "Repo: test-repo\nLangs: TS",
      generationIteration: 1,
    } as any;

    const compiled = await promptBuilder.buildPrompt(
      GeneratedDocumentType.ARCHITECTURE,
      mockContext,
    );

    assert.equal(compiled.promptVersion, 1);
    assert.ok(
      compiled.systemPrompt.includes("expert principal software architect"),
    );
    assert.ok(
      compiled.userPrompt.includes("Generate the ARCHITECTURE document"),
    );
    assert.ok(compiled.userPrompt.includes("Repo: test-repo"));
    assert.ok(compiled.userPrompt.includes("Explain system design"));
    assert.ok((compiled.responseSchema as any).properties.markdown);
    assert.ok(compiled.userPrompt.includes("Generation Iteration: 1"));
  });

  it("should assemble critic evaluation prompt attaching document markdown", async () => {
    const mockContext = {
      repositoryName: "test-repo",
      formattedSummary: "Repo: test-repo\nLangs: TS",
    } as any;
    const mockDoc = {
      type: GeneratedDocumentType.README,
      markdown: "# README\nTest",
    } as any;

    const compiled = await promptBuilder.buildCriticPrompt(
      mockDoc,
      mockContext,
    );

    assert.equal(compiled.promptVersion, 1);
    assert.ok(compiled.systemPrompt.includes("Senior Technical Editor"));
    assert.ok(compiled.userPrompt.includes("# README\nTest"));
    assert.ok((compiled.responseSchema as any).properties.score);
  });

  it("should correctly format and include AI and human review feedback on subsequent iterations", async () => {
    const mockContext = {
      repositoryName: "test-repo",
      formattedSummary: "Repo: test-repo\nLangs: TS",
      generationIteration: 3,
      criticFeedback: {
        overallScore: 78,
        strengths: [],
        weaknesses: [
          "[README] [MAJOR] Content: Missing build instructions",
          "[API] [MINOR] Schema: Type formatting issues",
        ],
        suggestions: [
          "[README] Please add dynamic quickstart steps",
          "[API] Please add authentication example",
        ],
      },
      humanReviewFeedback: "Installation guide has typos.",
    } as any;

    const compiled = await promptBuilder.buildPrompt(
      GeneratedDocumentType.README,
      mockContext,
    );

    // Iteration verification
    assert.ok(compiled.userPrompt.includes("Generation Iteration: 3"));
    assert.ok(
      compiled.userPrompt.includes(
        "This documentation has been regenerated 2 time(s)",
      ),
    );

    // AI critic review verification (filtered for README, not API)
    assert.ok(compiled.userPrompt.includes("Previous AI Review"));
    assert.ok(compiled.userPrompt.includes("Overall Score: 78"));
    assert.ok(compiled.userPrompt.includes("Weaknesses"));
    assert.ok(
      compiled.userPrompt.includes(
        "MAJOR] Content: Missing build instructions",
      ),
    );
    assert.ok(
      !compiled.userPrompt.includes("MINOR] Schema: Type formatting issues"),
    ); // should be filtered out
    assert.ok(compiled.userPrompt.includes("Suggestions"));
    assert.ok(
      compiled.userPrompt.includes("Please add dynamic quickstart steps"),
    );
    assert.ok(
      !compiled.userPrompt.includes("Please add authentication example"),
    ); // should be filtered out

    // Human review verification
    assert.ok(compiled.userPrompt.includes("Reviewer Feedback"));
    assert.ok(compiled.userPrompt.includes("Installation guide has typos."));
  });

  it("should append codebase static analysis context to the prompt if available", async () => {
    const mockContext = {
      repositoryName: "test-repo",
      formattedSummary: "Repo: test-repo\nLangs: TS",
      generationIteration: 1,
      formattedSourceAnalysis:
        "### Discovered Codebase Structure & Architecture\n**Architectural Style**: NestJS Modular Architecture\n- Total Source Files: 3",
    } as any;

    const compiled = await promptBuilder.buildPrompt(
      GeneratedDocumentType.README,
      mockContext,
    );

    assert.ok(
      compiled.userPrompt.includes(
        "## Discovered Source Code Implementation Context",
      ),
    );
    assert.ok(compiled.userPrompt.includes("NestJS Modular Architecture"));
    assert.ok(compiled.userPrompt.includes("Total Source Files: 3"));
  });
});
