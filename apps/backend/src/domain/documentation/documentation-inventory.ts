import { DocumentationFile } from './documentation-file';

export interface DocumentationInventory {
  /** Developer-authored documentation files (no DocPulse marker). */
  documentationFiles: DocumentationFile[];
  /** Documentation files previously written by DocPulse (marker stripped from content). */
  previousGeneratedDocumentation: DocumentationFile[];
  missingDocuments: string[];
  outdatedDocuments: string[];
}
