import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MarkdownValidatorService } from "../../src/modules/document-generation/services/markdown-validator.service";

describe("MarkdownValidatorService Unit Tests", () => {
  const validator = new MarkdownValidatorService();

  it("should return valid true with zero warnings/errors on well-structured markdown", () => {
    const md = `# Overview\nThis is great.\n## Setup\nRun pnpm install\n\`\`\`bash\npnpm install\n\`\`\``;
    const res = validator.validate(md);
    assert.equal(res.valid, true);
    assert.equal(res.errors.length, 0);
    assert.equal(res.warnings.length, 0);
  });

  it("should flag errors on missing headings or unclosed code fences", () => {
    const invalid = `Just text without heading\n\`\`\`json\n{ "unclosed": true }`;
    const res = validator.validate(invalid);
    assert.equal(res.valid, false);
    assert.ok(
      res.errors.some((e) => e.message.includes("no Markdown headings")),
    );
    assert.ok(
      res.errors.some((e) =>
        e.message.includes("Unclosed Markdown code fence"),
      ),
    );
  });

  it("should flag diagnostic warnings on duplicate headings and empty sections", () => {
    const md = `# Title\n## Dup\nSome content\n## Dup\nMore content\n## EmptySection\n## NextSection\nDone`;
    const res = validator.validate(md);
    assert.equal(res.valid, true); // errors empty, valid true
    assert.ok(
      res.warnings.some((w) => w.message.includes("Duplicate level 2 heading")),
    );
    assert.ok(
      res.warnings.some((w) => w.message.includes("contains an empty section")),
    );
  });
});
