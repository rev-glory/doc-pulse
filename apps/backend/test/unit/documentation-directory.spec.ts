import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  isValidDocumentationDirectory,
  normalizeDocumentationDirectory,
} from "../../src/modules/repositories/validators/documentation-directory.validator";
import { RepositoriesService } from "../../src/modules/repositories/services/repositories.service";
import { DocumentationWriterService } from "../../src/modules/git-operations/services/documentation-writer.service";
import { buildDocumentationInventory } from "../../src/modules/repository-analysis/utils/documentation-detector.util";
import { DocumentationType } from "../../src/domain/documentation/enums";
import { GeneratedDocumentType } from "../../src/domain/workflow/workflow-state";

describe("Configurable Docs Directory - Validator & Normalizer", () => {
  it("should normalize documentation directories correctly", () => {
    assert.equal(normalizeDocumentationDirectory(""), ".");
    assert.equal(normalizeDocumentationDirectory("."), ".");
    assert.equal(normalizeDocumentationDirectory("/"), ".");
    assert.equal(normalizeDocumentationDirectory("\\"), ".");
    assert.equal(normalizeDocumentationDirectory("docs"), "docs");
    assert.equal(normalizeDocumentationDirectory("docs///"), "docs");
    assert.equal(
      normalizeDocumentationDirectory("project//docs/"),
      "project/docs",
    );
    assert.equal(
      normalizeDocumentationDirectory("\\project\\\\docs\\\\\\"),
      "project/docs",
    );
  });

  it("should validate documentation directories correctly", () => {
    assert.equal(isValidDocumentationDirectory("docs"), true);
    assert.equal(isValidDocumentationDirectory("project/docs"), true);
    assert.equal(isValidDocumentationDirectory("."), true);

    // Invalid directories
    assert.equal(isValidDocumentationDirectory(""), false);
    assert.equal(isValidDocumentationDirectory("../docs"), false);
    assert.equal(isValidDocumentationDirectory("project/../docs"), false);
    assert.equal(isValidDocumentationDirectory("/docs"), false);
    assert.equal(isValidDocumentationDirectory("\\docs"), false);
    assert.equal(isValidDocumentationDirectory("C:\\docs"), false);
  });
});

describe("Configurable Docs Directory - Service Layer", () => {
  it("should validate and normalize database values on PATCH", async () => {
    const mockPersistence: any = {
      findById: mock.fn(async () => ({
        id: "repo-1",
        ownerId: "user-1",
        documentationDirectory: "docs",
        fullName: "test/repo",
      })),
      update: mock.fn(async (id: string, data: any) => ({
        id,
        ...data,
      })),
    };

    const service = new RepositoriesService(
      mockPersistence,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    // 1. Valid update should be normalized
    const res1 = await service.updateRepository(
      "repo-1",
      { documentationDirectory: "my///docs///" },
      { id: "user-1" } as any,
    );
    assert.equal(res1.documentationDirectory, "my/docs");

    // 2. Traversal path update should throw
    await assert.rejects(
      () =>
        service.updateRepository(
          "repo-1",
          { documentationDirectory: "../invalid" },
          { id: "user-1" } as any,
        ),
      (err: any) => err.message.includes("Invalid documentation directory"),
    );

    // 3. Absolute path update should throw
    await assert.rejects(
      () =>
        service.updateRepository(
          "repo-1",
          { documentationDirectory: "/absolute" },
          { id: "user-1" } as any,
        ),
      (err: any) => err.message.includes("Invalid documentation directory"),
    );
  });
});

describe("Configurable Docs Directory - Document Writer & Loader", () => {
  const tempWorkspace = path.join(__dirname, "temp_docs_dir_test_workspace");

  beforeEach(async () => {
    await fs
      .rm(tempWorkspace, { recursive: true, force: true })
      .catch(() => {});
    await fs.mkdir(tempWorkspace, { recursive: true });
  });

  afterEach(async () => {
    await fs
      .rm(tempWorkspace, { recursive: true, force: true })
      .catch(() => {});
  });

  it('should write documents to repository root (cleanDir === ".")', async () => {
    const writer = new DocumentationWriterService();
    const docs = [
      {
        id: "doc-1",
        type: GeneratedDocumentType.README,
        markdown: "# Title",
        path: "README.md",
      },
    ];

    const res = await writer.writeDocuments(tempWorkspace, "run-1", docs, ".");
    assert.deepEqual(res.writtenFiles, ["README.md"]);

    const readmeContent = await fs.readFile(
      path.join(tempWorkspace, "README.md"),
      "utf8",
    );
    assert.equal(readmeContent, "# Title");
  });

  it("should write documents inside a nested docs/ directory recursively", async () => {
    const writer = new DocumentationWriterService();
    const docs = [
      {
        id: "doc-1",
        type: GeneratedDocumentType.README,
        markdown: "# Title",
        path: "README.md",
      },
    ];

    const res = await writer.writeDocuments(
      tempWorkspace,
      "run-1",
      docs,
      "project/docs///",
    );
    assert.deepEqual(res.writtenFiles, [
      path.join("project/docs", "README.md"),
    ]);

    const readmeContent = await fs.readFile(
      path.join(tempWorkspace, "project/docs/README.md"),
      "utf8",
    );
    assert.equal(readmeContent, "# Title");
  });

  it("should return empty documentation inventory instead of throwing when directory does not exist", async () => {
    const inv = await buildDocumentationInventory(
      tempWorkspace,
      "non-existent-dir",
    );
    assert.equal(inv.documentationFiles.length, 0);
    assert.ok(inv.missingDocuments.includes(DocumentationType.README));
  });

  it("should read documentation from configured directory and ignore other places", async () => {
    // 1. Setup docs/ and project/docs/
    await fs.mkdir(path.join(tempWorkspace, "docs"), { recursive: true });
    await fs.mkdir(path.join(tempWorkspace, "project/docs"), {
      recursive: true,
    });

    await fs.writeFile(
      path.join(tempWorkspace, "docs/README.md"),
      "# Old Readme",
    );
    await fs.writeFile(
      path.join(tempWorkspace, "project/docs/README.md"),
      "# New Readme",
    );

    // 2. Read from default "docs"
    const invDocs = await buildDocumentationInventory(tempWorkspace, "docs");
    assert.equal(invDocs.documentationFiles.length, 1);
    assert.equal(invDocs.documentationFiles[0].fileName, "README.md");
    assert.equal(invDocs.documentationFiles[0].path, "docs/README.md");

    // 3. Transition test: Changing configuration to "project/docs" reads the new folder instead
    const invProject = await buildDocumentationInventory(
      tempWorkspace,
      "project/docs",
    );
    assert.equal(invProject.documentationFiles.length, 1);
    assert.equal(invProject.documentationFiles[0].fileName, "README.md");
    assert.equal(
      invProject.documentationFiles[0].path,
      "project/docs/README.md",
    );
  });
});
