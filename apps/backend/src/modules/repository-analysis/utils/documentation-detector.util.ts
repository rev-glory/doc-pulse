import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { REPOSITORY_ANALYSIS_CONSTANTS } from '../constants/repository-analysis.constants';
import { DocumentationInventory, DocumentationFile, DocumentationType } from '../../../domain/documentation';

export async function detectDocumentation(rootPath: string): Promise<string[]> {
  const docs: string[] = [];
  const entries = await fs.readdir(rootPath).catch(() => [] as string[]);

  // Check common docs patterns
  for (const entry of entries) {
    const isMatch = REPOSITORY_ANALYSIS_CONSTANTS.DOCUMENTATION_PATTERNS.some((pattern) => {
      return entry.toLowerCase().startsWith(pattern.toLowerCase());
    });

    if (isMatch) {
      docs.push(entry);
    }
  }

  return docs;
}

export async function detectEnvironmentFiles(rootPath: string): Promise<string[]> {
  const envFiles: string[] = [];
  const entries = await fs.readdir(rootPath).catch(() => [] as string[]);

  for (const file of REPOSITORY_ANALYSIS_CONSTANTS.ENVIRONMENT_FILES) {
    if (entries.includes(file)) {
      envFiles.push(file);
    }
  }

  return envFiles;
}

export async function detectApiSpecifications(rootPath: string): Promise<string[]> {
  const specs: string[] = [];
  const entries = await fs.readdir(rootPath).catch(() => [] as string[]);

  for (const file of REPOSITORY_ANALYSIS_CONSTANTS.API_SPECIFICATIONS) {
    if (entries.includes(file)) {
      specs.push(file);
    }
  }

  return specs;
}

export async function buildDocumentationInventory(rootPath: string): Promise<DocumentationInventory> {
  const documentationFiles: DocumentationFile[] = [];
  const standardDocs = Object.values(DocumentationType).filter(type => type !== DocumentationType.Other);
  const foundTypes = new Set<DocumentationType>();

  // Helper to map filename to type
  const mapType = (filename: string): DocumentationType => {
    const lower = filename.toLowerCase();
    if (lower.includes('readme')) return DocumentationType.README;
    if (lower.includes('architecture')) return DocumentationType.Architecture;
    if (lower.includes('api')) return DocumentationType.API;
    if (lower.includes('deploy')) return DocumentationType.Deployment;
    if (lower.includes('contributing')) return DocumentationType.Contributing;
    if (lower.includes('changelog')) return DocumentationType.Changelog;
    if (lower.includes('license')) return DocumentationType.License;
    return DocumentationType.Other;
  };

  const processDir = async (dirPath: string) => {
    const entries = await fs.readdir(dirPath, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.isFile()) {
        const type = mapType(entry.name);
        
        // We only care if it's one of the standard docs, or if it's a known generic doc file in docs/
        if (type !== DocumentationType.Other || dirPath.endsWith('docs') || dirPath.endsWith('docs/') || dirPath.endsWith('docs\\')) {
           documentationFiles.push({
             fileName: entry.name,
             path: path.join(dirPath, entry.name).replace(rootPath, '').replace(/^[\\/]/, ''),
             type,
             exists: true,
             qualityScore: type === DocumentationType.README ? 1.0 : 1.0, // deterministic score placeholder
           });
           foundTypes.add(type);
        }
      }
    }
  };

  // Process root
  await processDir(rootPath);
  
  // Also process common doc folders like docs/ if it exists
  const docsPath = path.join(rootPath, 'docs');
  try {
    const stat = await fs.stat(docsPath);
    if (stat.isDirectory()) {
      await processDir(docsPath);
    }
  } catch {
    // Ignore if docs/ doesn't exist
  }

  const missingDocuments = standardDocs.filter(type => !foundTypes.has(type));

  return {
    documentationFiles,
    missingDocuments,
    outdatedDocuments: [], // TODO: Future commits will use metadata & LLM review to populate this
  };
}

