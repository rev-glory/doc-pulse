import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { DocumentGenerationService } from '../../src/modules/document-generation/services/document-generation.service';
import { RepositoryContextBuilderService } from '../../src/modules/document-generation/services/repository-context-builder.service';
import { PromptBuilderService } from '../../src/modules/document-generation/services/prompt-builder.service';
import { OutputParserService } from '../../src/modules/document-generation/services/output-parser.service';
import { MarkdownValidatorService } from '../../src/modules/document-generation/services/markdown-validator.service';
import { PromptTemplateService } from '../../src/modules/ai/services/prompt-template.service';

describe('DocumentGenerationService (Technical Writer Agent Core)', () => {
  it('should generate all 6 documentation files independently with bounded concurrency and structured metrics', async () => {
    const mockLlmService = {
      generateStructured: mock.fn(async ({ prompt }: any) => {
        let title = 'Doc';
        let path = 'doc.md';
        if (prompt.includes('README')) {
          title = 'README.md';
          path = 'README.md';
        } else if (prompt.includes('ARCHITECTURE')) {
          title = 'ARCHITECTURE.md';
          path = 'ARCHITECTURE.md';
        } else if (prompt.includes('API')) {
          title = 'API.md';
          path = 'API.md';
        } else if (prompt.includes('INSTALLATION')) {
          title = 'INSTALLATION.md';
          path = 'INSTALLATION.md';
        } else if (prompt.includes('CONTRIBUTING')) {
          title = 'CONTRIBUTING.md';
          path = 'CONTRIBUTING.md';
        } else if (prompt.includes('DEPLOYMENT')) {
          title = 'DEPLOYMENT.md';
          path = 'DEPLOYMENT.md';
        }

        return {
          text: JSON.stringify({
            title,
            path,
            markdown: `# ${title}\nContent`,
            summary: `Summary of ${title}`,
          }),
          usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
        };
      }),
    };

    const mockConfigService = {
      get: mock.fn((key: string, def?: any) => {
        if (key === 'DOC_GEN_CONCURRENCY') return 2;
        if (key === 'gemini.model') return 'gemini-3.1-pro';
        return def;
      }),
    };

    const contextBuilder = new RepositoryContextBuilderService();
    const promptBuilder = new PromptBuilderService(new PromptTemplateService());
    const outputParser = new OutputParserService();
    const markdownValidator = new MarkdownValidatorService();

    const service = new DocumentGenerationService(
      mockLlmService as any,
      contextBuilder,
      promptBuilder,
      outputParser,
      markdownValidator,
      mockConfigService as any,
    );

    const mockState = {
      runId: 'run-123',
      repositoryId: 'repo-1',
      repository: { name: 'test-repo', rootPath: '/tmp' },
      documentation: { documentationFiles: [] },
    };

    const generatedDocs = await service.generateDocuments(mockState as any);

    assert.equal(generatedDocs.length, 6);
    assert.equal(mockLlmService.generateStructured.mock.calls.length, 6);

    const readmeDoc = generatedDocs.find((d) => d.type === 'README');
    assert.ok(readmeDoc);
    assert.equal(readmeDoc.title, 'README.md');
    assert.equal(readmeDoc.content, '# README.md\nContent'); // compatibility getter verification
    assert.equal(readmeDoc.metrics?.totalTokens, 150);
    assert.equal(readmeDoc.metrics?.model, 'gemini-3.1-pro');
  });
});
