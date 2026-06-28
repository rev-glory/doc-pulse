import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDocumentationWorkflowGraph } from '../../src/modules/workflow/graph/documentation-workflow.graph';
import { WorkflowNodeName } from '../../src/domain/workflow';

describe('Documentation Workflow Graph Routing Unit Tests', () => {
  const mockAdapters = {
    repositoryAnalyzerStep: async (state: any) => ({ ...state, currentNode: WorkflowNodeName.RepositoryAnalyzer }),
    documentationLocatorStep: async (state: any) => ({ ...state, currentNode: WorkflowNodeName.DocumentationLocator }),
    codebaseAnalyzerStep: async (state: any) => ({ ...state, currentNode: WorkflowNodeName.CodebaseAnalyzer }),
    technicalWriterStep: async (state: any) => {
      // Mirror TechnicalWriterNode: increments iteration on human rejection, clears human status & feedback
      if (state.metadata?.firstNodeToExecute === WorkflowNodeName.GitCommit) {
        return { ...state, currentNode: WorkflowNodeName.TechnicalWriter };
      }
      const currentIteration = state.generationIteration ?? 1;
      const isRegeneration = state.humanReviewStatus === 'REJECTED';
      const nextIteration = isRegeneration ? currentIteration + 1 : currentIteration;
      return {
        ...state,
        currentNode: WorkflowNodeName.TechnicalWriter,
        humanReviewStatus: undefined,
        humanReviewFeedback: undefined,
        generationIteration: nextIteration,
      };
    },
    documentationCriticStep: async (state: any) => ({ ...state, currentNode: WorkflowNodeName.DocumentationCritic }),
    gitCommitStep: async (state: any) => ({ ...state, currentNode: WorkflowNodeName.GitCommit }),
    pushBranchStep: async (state: any) => ({ ...state, currentNode: WorkflowNodeName.PushBranch }),
    createPullRequestStep: async (state: any) => ({ ...state, currentNode: WorkflowNodeName.CreatePullRequest }),
  } as any;

  const config = { minDocScore: 80 };
  const graph = buildDocumentationWorkflowGraph(mockAdapters, config);

  it('should suspend and route to END if AI review passes but no human decision exists yet', async () => {
    const initialState = {
      runId: 'run-1',
      repositoryId: 'repo-1',
      workspacePath: '/tmp/repo-1',
      currentNode: WorkflowNodeName.DocumentationCritic,
      criticReview: { passed: true, score: 90 },
      humanReviewStatus: undefined,
      metadata: { firstNodeToExecute: WorkflowNodeName.RepositoryAnalyzer },
    };

    const finalState = await graph.invoke(initialState as any);
    // Under the human-in-the-loop review workflow, it must suspend (route to END) even on high AI scores
    assert.equal(finalState.currentNode, WorkflowNodeName.DocumentationCritic);
  });

  it('should suspend and route to END if AI review fails and no human decision exists yet', async () => {
    const initialState = {
      runId: 'run-2',
      repositoryId: 'repo-1',
      workspacePath: '/tmp/repo-1',
      currentNode: WorkflowNodeName.DocumentationCritic,
      criticReview: { passed: false, score: 75 },
      humanReviewStatus: undefined,
      metadata: { firstNodeToExecute: WorkflowNodeName.RepositoryAnalyzer },
    };

    const finalState = await graph.invoke(initialState as any);
    assert.equal(finalState.currentNode, WorkflowNodeName.DocumentationCritic);
  });

  it('should proceed to GitCommit if human review status is APPROVED regardless of AI review status', async () => {
    const initialState = {
      runId: 'run-3',
      repositoryId: 'repo-1',
      workspacePath: '/tmp/repo-1',
      currentNode: WorkflowNodeName.DocumentationCritic,
      criticReview: { passed: false, score: 75 }, // failed AI review
      humanReviewStatus: 'APPROVED',
      metadata: { firstNodeToExecute: WorkflowNodeName.GitCommit }, // skips writer/critic node step
    };

    const finalState = await graph.invoke(initialState as any);
    assert.equal(finalState.currentNode, WorkflowNodeName.CreatePullRequest);
  });

  it('should route to END (suspend) if human review status is REJECTED and new AI review fails', async () => {
    const initialState = {
      runId: 'run-4',
      repositoryId: 'repo-1',
      workspacePath: '/tmp/repo-1',
      currentNode: WorkflowNodeName.DocumentationCritic,
      criticReview: { passed: false, score: 70 }, // failed AI review after regeneration
      humanReviewStatus: 'REJECTED',
      metadata: { firstNodeToExecute: WorkflowNodeName.TechnicalWriter }, // triggers regeneration
    };

    const finalState = await graph.invoke(initialState as any);
    assert.equal(finalState.currentNode, WorkflowNodeName.DocumentationCritic);
    // Verify iteration is incremented
    assert.equal(finalState.generationIteration, 2);
  });

  it('should still route to END (suspend) if human review status is REJECTED and new AI review passes', async () => {
    const initialState = {
      runId: 'run-5',
      repositoryId: 'repo-1',
      workspacePath: '/tmp/repo-1',
      currentNode: WorkflowNodeName.DocumentationCritic,
      criticReview: { passed: true, score: 95 }, // passed AI review after regeneration
      humanReviewStatus: 'REJECTED',
      metadata: { firstNodeToExecute: WorkflowNodeName.TechnicalWriter }, // triggers regeneration
    };

    const finalState = await graph.invoke(initialState as any);
    // Every regeneration iteration must go back to WAITING_FOR_REVIEW (END)
    assert.equal(finalState.currentNode, WorkflowNodeName.DocumentationCritic);
    // Verify iteration is incremented
    assert.equal(finalState.generationIteration, 2);
  });
});
