import { Annotation } from '@langchain/langgraph';
import { WorkflowState } from '../../../domain/workflow';

export const WorkflowAnnotation = Annotation.Root({
  runId: Annotation<WorkflowState['runId']>(),
  repositoryId: Annotation<WorkflowState['repositoryId']>(),
  repository: Annotation<WorkflowState['repository']>(),
  documentation: Annotation<WorkflowState['documentation']>(),
  generatedDocuments: Annotation<WorkflowState['generatedDocuments']>(),
  criticReview: Annotation<WorkflowState['criticReview']>(),
  pullRequest: Annotation<WorkflowState['pullRequest']>(),
  branchName: Annotation<WorkflowState['branchName']>(),
  commitSha: Annotation<WorkflowState['commitSha']>(),
  pullRequestNumber: Annotation<WorkflowState['pullRequestNumber']>(),
  pullRequestUrl: Annotation<WorkflowState['pullRequestUrl']>(),
  gitOperationStatus: Annotation<WorkflowState['gitOperationStatus']>(),
  executionStatus: Annotation<WorkflowState['executionStatus']>(),
  generation: Annotation<WorkflowState['generation']>(),
  review: Annotation<WorkflowState['review']>(),
  metadata: Annotation<WorkflowState['metadata']>(),
});
