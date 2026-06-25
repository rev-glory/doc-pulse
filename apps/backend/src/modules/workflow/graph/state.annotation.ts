import { Annotation } from '@langchain/langgraph';
import { WorkflowState } from '../../../domain/workflow';

// Define the LangGraph state annotation mapping directly to the domain's WorkflowState.
// Provide explicit default and reducer definitions to handle state updates properly.
export const WorkflowAnnotation = Annotation.Root({
  runId: Annotation<WorkflowState['runId']>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
  repositoryId: Annotation<WorkflowState['repositoryId']>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
  repository: Annotation<WorkflowState['repository']>({
    reducer: (left, right) => right ?? left,
  }),
  documentation: Annotation<WorkflowState['documentation']>({
    reducer: (left, right) => right ?? left,
  }),
  generatedDocuments: Annotation<WorkflowState['generatedDocuments']>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
  criticReview: Annotation<WorkflowState['criticReview']>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
  pullRequest: Annotation<WorkflowState['pullRequest']>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
  executionStatus: Annotation<WorkflowState['executionStatus']>({
    reducer: (left, right) => right ?? left,
    default: () => 'pending',
  }),
  currentNode: Annotation<WorkflowState['currentNode']>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
  startedAt: Annotation<WorkflowState['startedAt']>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
  completedAt: Annotation<WorkflowState['completedAt']>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
  metadata: Annotation<WorkflowState['metadata']>({
    reducer: (left, right) => ({ ...left, ...(right ?? {}) }),
    default: () => ({}),
  }),
});
