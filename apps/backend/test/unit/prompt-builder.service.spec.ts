import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PromptBuilderService } from '../../src/modules/document-generation/services/prompt-builder.service';
import { PromptTemplateService } from '../../src/modules/ai/services/prompt-template.service';
import { GeneratedDocumentType } from '../../src/domain/workflow';

describe('PromptBuilderService Unit Tests', () => {
  const templateService = new PromptTemplateService();
  const promptBuilder = new PromptBuilderService(templateService);

  it('should assemble system and user prompt attaching versioning and guidelines', async () => {
    const mockContext = {
      repositoryName: 'test-repo',
      formattedSummary: 'Repo: test-repo\nLangs: TS',
    } as any;

    const compiled = await promptBuilder.buildPrompt(GeneratedDocumentType.ARCHITECTURE, mockContext);

    assert.equal(compiled.promptVersion, 1);
    assert.ok(compiled.systemPrompt.includes('expert principal software architect'));
    assert.ok(compiled.userPrompt.includes('Generate the ARCHITECTURE document'));
    assert.ok(compiled.userPrompt.includes('Repo: test-repo'));
    assert.ok(compiled.userPrompt.includes('Explain system design'));
    assert.ok((compiled.responseSchema as any).properties.markdown);
  });

  it('should assemble critic evaluation prompt attaching document markdown', async () => {
    const mockContext = {
      repositoryName: 'test-repo',
      formattedSummary: 'Repo: test-repo\nLangs: TS',
    } as any;
    const mockDoc = {
      type: GeneratedDocumentType.README,
      markdown: '# README\nTest',
    } as any;

    const compiled = await promptBuilder.buildCriticPrompt(mockDoc, mockContext);

    assert.equal(compiled.promptVersion, 1);
    assert.ok(compiled.systemPrompt.includes('Senior Technical Editor'));
    assert.ok(compiled.userPrompt.includes('# README\nTest'));
    assert.ok((compiled.responseSchema as any).properties.score);
  });
});
