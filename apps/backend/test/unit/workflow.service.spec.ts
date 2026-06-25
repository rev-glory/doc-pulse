import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { WorkflowService } from '../../src/modules/workflow/services/workflow.service';
import { RepositoryAnalyzerNode } from '../../src/modules/workflow/nodes/repository-analyzer.node';
import { DocumentationLocatorNode } from '../../src/modules/workflow/nodes/documentation-locator.node';
import { TechnicalWriterNode } from '../../src/modules/workflow/nodes/technical-writer.node';
import { DocumentationCriticNode } from '../../src/modules/workflow/nodes/documentation-critic.node';
import { WorkflowState } from '../../src/domain/workflow';

describe('WorkflowService Orchestration', () => {
  let workflowService: WorkflowService;
  let repositoryAnalyzerNode: RepositoryAnalyzerNode;
  let documentationLocatorNode: DocumentationLocatorNode;
  let technicalWriterNode: TechnicalWriterNode;
  let documentationCriticNode: DocumentationCriticNode;

  beforeEach(() => {
    repositoryAnalyzerNode = { invoke: mock.fn() } as any;
    documentationLocatorNode = { invoke: mock.fn() } as any;
    technicalWriterNode = { invoke: mock.fn() } as any;
    documentationCriticNode = { invoke: mock.fn() } as any;

    workflowService = new WorkflowService(
      repositoryAnalyzerNode,
      documentationLocatorNode,
      technicalWriterNode,
      documentationCriticNode,
    );

    workflowService.onModuleInit();
  });

  it('should execute all four nodes in sequential order and accumulate full state', async () => {
    const executionSequence: string[] = [];

    const mockRepo = { name: 'test-repo', rootPath: '/tmp/test' } as any;
    const mockDocs = { documentationFiles: [] } as any;
    const mockGenDocs = [{ id: 'doc-1', title: 'README', path: 'README.md', content: 'hello', type: 'README' as any }];
    const mockReview = { score: 100, passed: true, issues: [], suggestions: [] };

    (repositoryAnalyzerNode.invoke as any).mock.mockImplementation(async (state: any) => {
      executionSequence.push('repositoryAnalyzer');
      return state;
    });

    (documentationLocatorNode.invoke as any).mock.mockImplementation(async () => {
      executionSequence.push('documentationLocator');
      return { documentation: mockDocs };
    });

    (technicalWriterNode.invoke as any).mock.mockImplementation(async () => {
      executionSequence.push('technicalWriter');
      return { generatedDocuments: mockGenDocs };
    });

    (documentationCriticNode.invoke as any).mock.mockImplementation(async () => {
      executionSequence.push('documentationCritic');
      return { criticReview: mockReview };
    });

    const initialState: WorkflowState = {
      repository: mockRepo,
      documentation: undefined as any,
    };

    const finalState = await workflowService.run(initialState);

    // Verify sequential execution
    assert.deepEqual(executionSequence, [
      'repositoryAnalyzer',
      'documentationLocator',
      'technicalWriter',
      'documentationCritic',
    ]);

    // Verify accumulated state
    assert.equal(finalState.repository, mockRepo);
    assert.equal(finalState.documentation, mockDocs);
    assert.equal(finalState.generatedDocuments, mockGenDocs);
    assert.equal(finalState.criticReview, mockReview);
  });
});
