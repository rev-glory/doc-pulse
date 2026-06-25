import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { StateGraph, START, END, CompiledStateGraph } from '@langchain/langgraph';
import { WorkflowAnnotation } from '../graph/state.annotation';
import { RepositoryAnalyzerNode } from '../nodes/repository-analyzer.node';
import { DocumentationLocatorNode } from '../nodes/documentation-locator.node';
import { WorkflowState } from '../../../domain/workflow';

@Injectable()
export class WorkflowService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowService.name);
  
  // The graph is compiled once during initialization and reused.
  private compiledGraph!: CompiledStateGraph<any, any, any>;

  constructor(
    private readonly repositoryAnalyzerNode: RepositoryAnalyzerNode,
    private readonly documentationLocatorNode: DocumentationLocatorNode,
  ) {}

  public onModuleInit() {
    this.logger.debug('Compiling LangGraph Workflow Foundation...');

    const graphBuilder = new StateGraph(WorkflowAnnotation)
      // Register nodes
      .addNode('repositoryAnalyzer', (state) => this.repositoryAnalyzerNode.invoke(state))
      .addNode('documentationLocator', (state) => this.documentationLocatorNode.invoke(state))
      
      // Define edges to create a linear graph: START -> repositoryAnalyzer -> documentationLocator -> END
      .addEdge(START, 'repositoryAnalyzer')
      .addEdge('repositoryAnalyzer', 'documentationLocator')
      .addEdge('documentationLocator', END);

    // Compile without persistence or memory
    this.compiledGraph = graphBuilder.compile() as any;
    
    this.logger.debug('LangGraph Workflow Foundation compiled successfully.');
  }

  public async run(initialState: WorkflowState): Promise<WorkflowState> {
    this.logger.debug('Executing workflow run...');
    
    // The graph returns the final state based on the WorkflowAnnotation structure
    const finalState = await this.compiledGraph.invoke(initialState as any);
    
    // Cast it back to our domain model (WorkflowState)
    return finalState as unknown as WorkflowState;
  }
}
