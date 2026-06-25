import { RepositorySummary } from '../repository';
import { DocumentationInventory } from '../documentation';

export interface WorkflowState {
  repository: RepositorySummary;
  documentation: DocumentationInventory;
  generation?: any; // Placeholder for future generation models
  review?: any; // Placeholder for future review models
}
