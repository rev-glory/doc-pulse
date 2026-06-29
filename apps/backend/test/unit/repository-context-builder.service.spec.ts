import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RepositoryContextBuilderService } from "../../src/modules/document-generation/services/repository-context-builder.service";
import type { WorkflowState } from "../../src/domain/workflow";

describe("RepositoryContextBuilderService Unit Tests", () => {
  const builder = new RepositoryContextBuilderService();

  it("should deterministically transform WorkflowState into RepositoryGenerationContext without side effects", () => {
    const mockState: WorkflowState = {
      repository: {
        name: "doc-pulse",
        rootPath: "/work/doc-pulse",
        detectedLanguages: ["TypeScript"],
        detectedFrameworks: ["NestJS"],
        packageJson: { dependencies: { bullmq: "^5.0.0" } },
      } as any,
      documentation: {
        documentationFiles: [
          { path: "docs/arch.md" },
          { path: "README.md", summary: "old readme" },
        ],
        missingDocuments: ["API.md"],
      } as any,
      metadata: {
        gitDiff: "+ function newFeature() {}",
      },
    };

    const ctx = builder.buildContext(mockState);

    assert.equal(ctx.repositoryName, "doc-pulse");
    assert.deepEqual(ctx.languages, ["TypeScript"]);
    assert.deepEqual(ctx.frameworks, ["NestJS"]);
    assert.equal(ctx.dependencies.bullmq, "^5.0.0");
    assert.deepEqual(ctx.missingDocs, ["API.md"]);
    assert.equal(ctx.readmeContent, "old readme");
    assert.equal(ctx.gitDiff, "+ function newFeature() {}");
    assert.ok(ctx.formattedSummary.includes("Repository: doc-pulse"));
    assert.ok(ctx.formattedSummary.includes("Git Diff Available: Yes"));
  });
});
