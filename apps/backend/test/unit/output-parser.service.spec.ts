import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UnprocessableEntityException } from '@nestjs/common';
import { OutputParserService } from '../../src/modules/document-generation/services/output-parser.service';
import { GeneratedDocumentType } from '../../src/domain/workflow';

describe('OutputParserService Unit Tests', () => {
  const parser = new OutputParserService();
  const docType = GeneratedDocumentType.README;

  it('should successfully parse valid JSON into canonical GeneratedDocument with content getter', () => {
    const raw = JSON.stringify({
      title: 'README.md',
      path: 'README.md',
      markdown: '# DocPulse\nAwesome project',
      summary: 'Project overview',
      extraField: 'should be ignored safely',
    });

    const doc = parser.parse(raw, docType, {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      generationDurationMs: 100,
      promptVersion: 1,
      model: 'gemini-2.5-flash',
    });

    assert.equal(doc.title, 'README.md');
    assert.equal(doc.path, 'README.md');
    assert.equal(doc.markdown, '# DocPulse\nAwesome project');
    assert.equal(doc.summary, 'Project overview');
    assert.equal(doc.type, docType);
    assert.equal(doc.content, '# DocPulse\nAwesome project'); // compatibility getter verification
    assert.equal(doc.metrics?.totalTokens, 30);
  });

  it('should recover JSON wrapped in markdown json fences (wrapped JSON response)', () => {
    const wrapped = `Here is the generated output:\n\`\`\`json\n{\n  "title": "API Docs",\n  "path": "docs/API.md",\n  "markdown": "# API\\nEndpoints",\n  "summary": "API spec"\n}\n\`\`\`\nHope this helps!`;

    const doc = parser.parse(wrapped, GeneratedDocumentType.API);
    assert.equal(doc.title, 'API Docs');
    assert.equal(doc.path, 'docs/API.md');
    assert.equal(doc.markdown, '# API\nEndpoints');
  });

  it('should throw UnprocessableEntityException on malformed JSON structure', () => {
    const malformed = `{ "title": "README", "path": "README.md", "markdown": "unclosed quotes }`;
    assert.throws(() => parser.parse(malformed, docType), UnprocessableEntityException);
  });

  it('should throw UnprocessableEntityException when missing required fields', () => {
    const missing = JSON.stringify({
      title: 'README',
      // missing path, markdown, summary
    });
    assert.throws(() => parser.parse(missing, docType), UnprocessableEntityException);
  });

  it('should throw UnprocessableEntityException on markdown-only responses (no JSON structure)', () => {
    const mdOnly = `# Project README\nThis is pure markdown without any JSON metadata structure.`;
    assert.throws(() => parser.parse(mdOnly, docType), UnprocessableEntityException);
  });

  it('should successfully parse valid critic review evaluation JSON', () => {
    const raw = JSON.stringify({
      score: 92,
      issues: [{ severity: 'MINOR', category: 'Clarity', message: 'Consider adding more examples' }],
      suggestions: ['Add a troubleshooting section'],
    });

    const parsed = parser.parseCriticReview(raw, docType);
    assert.equal(parsed.score, 92);
    assert.equal(parsed.issues.length, 1);
    assert.equal(parsed.issues[0]?.severity, 'MINOR');
    assert.equal(parsed.suggestions[0], 'Add a troubleshooting section');
  });

  it('should clamp score in critic review output', () => {
    const raw = JSON.stringify({
      score: 150,
      issues: [],
      suggestions: [],
    });

    const parsed = parser.parseCriticReview(raw, docType);
    assert.equal(parsed.score, 100);
  });
});
