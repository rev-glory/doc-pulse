import { DocumentationFile } from './documentation-file';

export interface DocumentationInventory {
  documentationFiles: DocumentationFile[];
  missingDocuments: string[];
  outdatedDocuments: string[];
}
