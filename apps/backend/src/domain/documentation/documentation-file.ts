import { DocumentationType } from './enums';

export interface DocumentationFile {
  fileName: string;
  path: string;
  type: DocumentationType;
  exists: boolean;
  qualityScore?: number;
  /** True when the file was written by DocPulse (begins with DOCPULSE_GENERATION_MARKER). */
  isDocPulseGenerated?: boolean;
  /** File body with the generation marker stripped, populated for DocPulse-generated files. */
  content?: string;
}
