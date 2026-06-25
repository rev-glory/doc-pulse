import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { StateGraph, START, END, CompiledStateGraph } from '@langchain/langgraph';
import { WorkflowAnnotation } from '../graph/state.annotation';
import { RepositoryAnalyzerNode } from '../nodes/repository-analyzer.node';
import { DocumentationLocatorNode } from '../nodes/documentation-locator.node';
import { TechnicalWriterNode } from '../nodes/technical-writer.node';
import { DocumentationCriticNode } from '../nodes/documentation-critic.node';
import { WorkflowState } from '../../../domain/workflow';

@Injectable()
export class WorkflowService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowService.name);

  /**
   * The compiled LangGraph state machine.
   * Note on LangGraph Typing:
   * CompiledStateGraph<any, any, any> is retained because LangChain's internal StateDefinition
   * generics and Annotation.Root structure require index signatures and internal channel mappings
   * that do not directly match plain domain interfaces (WorkflowState) without unsafe or excessive type gymnastics.
   */
  private compiledGraph!: CompiledStateGraph<any, any, any>;

  constructor(
    private readonly repositoryAnalyzerNode: RepositoryAnalyzerNode,
    private readonly documentationLocatorNode: DocumentationLocatorNode,
    private readonly technicalWriterNode: TechnicalWriterNode,
    private readonly documentationCriticNode: DocumentationCriticNode,
  ) {}

  public onModuleInit() {
    this.logger.debug('Compiling LangGraph Workflow Foundation...');

    const graphBuilder = new StateGraph(WorkflowAnnotation)
      // Register nodes
      .addNode('repositoryAnalyzer', (state) => this.repositoryAnalyzerNode.invoke(state))
      .addNode('documentationLocator', (state) => this.documentationLocatorNode.invoke(state))
      .addNode('technicalWriter', (state) => this.technicalWriterNode.invoke(state))
      .addNode('documentationCritic', (state) => this.documentationCriticNode.invoke(state))

      // Define edges to create a linear graph:
      // START -> repositoryAnalyzer -> documentationLocator -> technicalWriter -> documentationCritic -> END
      .addEdge(START, 'repositoryAnalyzer')
      .addEdge('repositoryAnalyzer', 'documentationLocator')
      .addEdge('documentationLocator', 'technicalWriter')
      .addEdge('technicalWriter', 'documentationCritic')
      .addEdge('documentationCritic', END);

    // Compile without persistence or memory
    // Cast retained due to LangGraph internal channel channel typing vs domain models
    this.compiledGraph = graphBuilder.compile() as any;

    this.logger.debug('LangGraph Workflow Foundation compiled successfully.');
  }

  public async run(initialState: WorkflowState): Promise<WorkflowState> {
    this.logger.debug('Executing workflow run...');

    // The graph executes all nodes sequentially and accumulates state
    const finalState = await this.compiledGraph.invoke(initialState as any);

    // Cast it back to our domain model (WorkflowState)
    return finalState as unknown as WorkflowState;
  }
}

