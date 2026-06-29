import { StateGraph, START, END } from '@langchain/langgraph';
import { WorkflowGraphAnnotation, WorkflowGraphState } from './graph.types';
import { WorkflowNodeAdapters } from './workflow-node-adapters';
import { WorkflowNodeName } from '../../../domain/workflow';

export interface DocumentationGraphConfig {
  minDocScore: number;
}

function compileDocumentationGraph(
  adapters: WorkflowNodeAdapters,
  _minDocScore: number,
) {
  const workflow = new StateGraph(WorkflowGraphAnnotation)
    .addNode(WorkflowNodeName.EarlySkip, (state: WorkflowGraphState) => adapters.earlySkipStep(state))
    .addNode(WorkflowNodeName.RepositoryAnalyzer, (state: WorkflowGraphState) => adapters.repositoryAnalyzerStep(state))
    .addNode(WorkflowNodeName.DocumentationLocator, (state: WorkflowGraphState) => adapters.documentationLocatorStep(state))
    .addNode(WorkflowNodeName.CodebaseAnalyzer, (state: WorkflowGraphState) => adapters.codebaseAnalyzerStep(state))
    .addNode(WorkflowNodeName.TechnicalWriter, (state: WorkflowGraphState) => adapters.technicalWriterStep(state))
    .addNode(WorkflowNodeName.DocumentationCritic, (state: WorkflowGraphState) => adapters.documentationCriticStep(state))
    .addNode(WorkflowNodeName.GitCommit, (state: WorkflowGraphState) => adapters.gitCommitStep(state))
    .addNode(WorkflowNodeName.PushBranch, (state: WorkflowGraphState) => adapters.pushBranchStep(state))
    .addNode(WorkflowNodeName.CreatePullRequest, (state: WorkflowGraphState) => adapters.createPullRequestStep(state))
    .addEdge(START, WorkflowNodeName.EarlySkip)
    .addConditionalEdges(
      WorkflowNodeName.EarlySkip,
      (state: WorkflowGraphState) => {
        if (state.shouldSkip === true) return 'skip';
        return 'continue';
      },
      {
        skip: END,
        continue: WorkflowNodeName.RepositoryAnalyzer,
      },
    )
    .addEdge(WorkflowNodeName.RepositoryAnalyzer, WorkflowNodeName.DocumentationLocator)
    .addEdge(WorkflowNodeName.DocumentationLocator, WorkflowNodeName.CodebaseAnalyzer)
    .addEdge(WorkflowNodeName.CodebaseAnalyzer, WorkflowNodeName.TechnicalWriter)
    .addEdge(WorkflowNodeName.TechnicalWriter, WorkflowNodeName.DocumentationCritic)

    .addConditionalEdges(
      WorkflowNodeName.DocumentationCritic,
      (state: WorkflowGraphState) => {
        const status = state.humanReviewStatus;
        if (status === 'APPROVED') return 'approve';
        if (status === 'REJECTED') return 'reject';
        return 'wait';
      },
      {
        approve: WorkflowNodeName.GitCommit,
        reject: WorkflowNodeName.TechnicalWriter,
        wait: END,
      },
    )
    .addEdge(WorkflowNodeName.GitCommit, WorkflowNodeName.PushBranch)
    .addEdge(WorkflowNodeName.PushBranch, WorkflowNodeName.CreatePullRequest)
    .addEdge(WorkflowNodeName.CreatePullRequest, END);

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
