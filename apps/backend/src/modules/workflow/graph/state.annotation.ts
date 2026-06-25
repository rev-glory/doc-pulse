import { Annotation } from '@langchain/langgraph';
import { WorkflowState } from '../../../domain/workflow';

// Define the LangGraph state annotation mapping directly to the domain's WorkflowState.
// We use a simple reducer that just overrides the value for now (no complex merging).
export const WorkflowAnnotation = Annotation.Root({
  repository: Annotation<WorkflowState['repository']>(),
  documentation: Annotation<WorkflowState['documentation']>(),
  generation: Annotation<WorkflowState['generation']>(),
  review: Annotation<WorkflowState['review']>(),
});
