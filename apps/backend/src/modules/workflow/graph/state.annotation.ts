import { Annotation } from '@langchain/langgraph';
import { WorkflowState } from '../../../domain/workflow';

export const WorkflowAnnotation = Annotation.Root({
  repository: Annotation<WorkflowState['repository']>(),
  documentation: Annotation<WorkflowState['documentation']>(),
  generatedDocuments: Annotation<WorkflowState['generatedDocuments']>(),
  criticReview: Annotation<WorkflowState['criticReview']>(),
  pullRequest: Annotation<WorkflowState['pullRequest']>(),
  executionStatus: Annotation<WorkflowState['executionStatus']>(),
  generation: Annotation<WorkflowState['generation']>(),
  review: Annotation<WorkflowState['review']>(),
});
