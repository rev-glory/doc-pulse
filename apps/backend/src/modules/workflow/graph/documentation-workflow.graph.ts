import { StateGraph, START, END } from '@langchain/langgraph';
import { WorkflowGraphAnnotation, WorkflowGraphState } from './graph.types';
import { WorkflowNodeAdapters } from './workflow-node-adapters';

export interface DocumentationGraphConfig {
  minDocScore: number;
}

function compileDocumentationGraph(
  adapters: WorkflowNodeAdapters,
  minDocScore: number,
) {
  const workflow = new StateGraph(WorkflowGraphAnnotation)
    .addNode('RepositoryAnalyzer', (state: WorkflowGraphState) => adapters.repositoryAnalyzerStep(state))
    .addNode('DocumentationLocator', (state: WorkflowGraphState) => adapters.documentationLocatorStep(state))
    .addNode('TechnicalWriter', (state: WorkflowGraphState) => adapters.technicalWriterStep(state))
    .addNode('DocumentationCritic', (state: WorkflowGraphState) => adapters.documentationCriticStep(state))
    .addNode('PullRequestGenerator', (state: WorkflowGraphState) => adapters.pullRequestGeneratorStep(state))

    .addEdge(START, 'RepositoryAnalyzer')
    .addEdge('RepositoryAnalyzer', 'DocumentationLocator')
    .addEdge('DocumentationLocator', 'TechnicalWriter')
    .addEdge('TechnicalWriter', 'DocumentationCritic')

    .addConditionalEdges(
      'DocumentationCritic',
      (state: WorkflowGraphState) => {
        const score = state.criticReview?.score ?? 0;
        return score >= minDocScore ? 'approve' : 'reject';
      },
      {
        approve: 'PullRequestGenerator',
        reject: END,
      },
    )
    .addEdge('PullRequestGenerator', END);

  return workflow.compile();
}

export type CompiledDocumentationGraph = ReturnType<typeof compileDocumentationGraph>;

/**
 * Compiles the LangGraph orchestration state machine without unsafe casts.
 */
export function buildDocumentationWorkflowGraph(
  adapters: WorkflowNodeAdapters,
  config: DocumentationGraphConfig,
): CompiledDocumentationGraph {
  return compileDocumentationGraph(adapters, config.minDocScore);
}
