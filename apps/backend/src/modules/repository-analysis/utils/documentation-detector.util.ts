import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { REPOSITORY_ANALYSIS_CONSTANTS } from '../constants/repository-analysis.constants';

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
