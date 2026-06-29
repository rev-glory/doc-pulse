import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { REPOSITORY_ANALYSIS_CONSTANTS } from '../constants/repository-analysis.constants';
import { DocumentationInventory, DocumentationFile, DocumentationType } from '../../../domain/documentation';

import { normalizeDocumentationDirectory } from '../../repositories/validators/documentation-directory.validator';

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

export async function buildDocumentationInventory(
  rootPath: string,
  documentationDirectory: string = 'docs',
): Promise<DocumentationInventory> {
  const documentationFiles: DocumentationFile[] = [];
  const standardDocs = Object.values(DocumentationType).filter(type => type !== DocumentationType.Other);
  const foundTypes = new Set<DocumentationType>();

  const cleanDir = normalizeDocumentationDirectory(documentationDirectory);
  const targetDir = cleanDir === '.' ? rootPath : path.join(rootPath, cleanDir);

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
        
        // We only care if it's one of the standard docs, or if it's a known generic doc file in targetDir
        if (type !== DocumentationType.Other || dirPath.endsWith('docs') || dirPath.endsWith('docs/') || dirPath.endsWith('docs\\') || (cleanDir !== '.' && dirPath.endsWith(cleanDir))) {
           documentationFiles.push({
             fileName: entry.name,
             path: path.join(dirPath, entry.name).replace(rootPath, '').replace(/^[\\/]/, '').replace(/\\/g, '/'),
             type,
             exists: true,
             qualityScore: type === DocumentationType.README ? 1.0 : 1.0, // deterministic score placeholder
           });
           foundTypes.add(type);
        }
      }
    }
  };

  // Verify the target directory exists and is a directory.
  // If it does not exist, return an empty documentation inventory instead of throwing.
  let directoryExists = false;
  try {
    const stat = await fs.stat(targetDir);
    if (stat.isDirectory()) {
      directoryExists = true;
    }
  } catch {
    // Ignore if directory doesn't exist
  }

  if (directoryExists) {
    await processDir(targetDir);
  }

  const missingDocuments = standardDocs.filter(type => !foundTypes.has(type));

  return {
    documentationFiles,
    missingDocuments,
    outdatedDocuments: [], // TODO: Future commits will use metadata & LLM review to populate this
  };
}

