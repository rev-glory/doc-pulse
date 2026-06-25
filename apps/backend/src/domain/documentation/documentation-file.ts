import { DocumentationType } from './enums';

export interface DocumentationFile {
  fileName: string;
  path: string;
  type: DocumentationType;
  exists: boolean;
  qualityScore?: number;
}
