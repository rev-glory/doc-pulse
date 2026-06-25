import { StateGraph, START, END } from '@langchain/langgraph';
import { WorkflowGraphAnnotation, WorkflowGraphState } from './graph.types';
import { WorkflowNodeAdapters } from './workflow-node-adapters';
import { WorkflowNodeName } from '../../../domain/workflow';

export interface DocumentationGraphConfig {
  minDocScore: number;
}

function compileDocumentationGraph(
  adapters: WorkflowNodeAdapters,
  minDocScore: number,
) {
  const workflow = new StateGraph(WorkflowGraphAnnotation)
    .addNode(WorkflowNodeName.RepositoryAnalyzer, (state: WorkflowGraphState) => adapters.repositoryAnalyzerStep(state))
    .addNode(WorkflowNodeName.DocumentationLocator, (state: WorkflowGraphState) => adapters.documentationLocatorStep(state))
    .addNode(WorkflowNodeName.TechnicalWriter, (state: WorkflowGraphState) => adapters.technicalWriterStep(state))
    .addNode(WorkflowNodeName.DocumentationCritic, (state: WorkflowGraphState) => adapters.documentationCriticStep(state))
    .addNode(WorkflowNodeName.PullRequestGenerator, (state: WorkflowGraphState) => adapters.pullRequestGeneratorStep(state))

    // Pure unchanged declarative linear topology
    .addEdge(START, WorkflowNodeName.RepositoryAnalyzer)
    .addEdge(WorkflowNodeName.RepositoryAnalyzer, WorkflowNodeName.DocumentationLocator)
    .addEdge(WorkflowNodeName.DocumentationLocator, WorkflowNodeName.TechnicalWriter)
    .addEdge(WorkflowNodeName.TechnicalWriter, WorkflowNodeName.DocumentationCritic)

    .addConditionalEdges(
      WorkflowNodeName.DocumentationCritic,
      (state: WorkflowGraphState) => {
        const score = state.criticReview?.score ?? 0;
        return score >= minDocScore ? 'approve' : 'reject';
      },
      {
        approve: WorkflowNodeName.PullRequestGenerator,
        reject: END,
      },
    )
    .addEdge(WorkflowNodeName.PullRequestGenerator, END);

  return workflow.compile();
}

export type CompiledDocumentationGraph = ReturnType<typeof compileDocumentationGraph>;

/**
 * Compiles the LangGraph orchestration state machine.
 */
export function buildDocumentationWorkflowGraph(
  adapters: WorkflowNodeAdapters,
  config: DocumentationGraphConfig,
): CompiledDocumentationGraph {
  return compileDocumentationGraph(adapters, config.minDocScore);
}
