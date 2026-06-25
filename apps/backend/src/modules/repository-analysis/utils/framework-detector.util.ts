import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Dependencies } from '../interfaces/repository-analysis.interface';
import { REPOSITORY_ANALYSIS_CONSTANTS } from '../constants/repository-analysis.constants';

export async function detectLanguages(rootPath: string): Promise<string[]> {
  const detectedLanguages = new Set<string>();
  const entries = await fs.readdir(rootPath).catch(() => [] as string[]);

  for (const [language, patterns] of Object.entries(REPOSITORY_ANALYSIS_CONSTANTS.LANGUAGES)) {
    for (const pattern of patterns) {
      if (pattern.startsWith('*.')) {
        // Basic heuristic: if it's an extension, check if any file in root ends with it
        const ext = pattern.slice(1);
        if (entries.some((entry) => entry.endsWith(ext))) {
          detectedLanguages.add(language);
        }
      } else {
        // Specific file check
        if (entries.includes(pattern)) {
          detectedLanguages.add(language);
        }
      }
    }
  }

  return Array.from(detectedLanguages);
}

export function detectFrameworks(dependencies: Dependencies): string[] {
  const frameworks: string[] = [];
  const allDeps = { ...dependencies.production, ...dependencies.development, ...dependencies.peer };

  for (const fw of REPOSITORY_ANALYSIS_CONSTANTS.FRAMEWORKS) {
    if (fw.packages) {
      const hasPackage = fw.packages.some((pkg) => allDeps[pkg]);
      if (hasPackage) {
        frameworks.push(fw.name);
      }
    }
  }

  return frameworks;
}

export function detectBuildTools(dependencies: Dependencies): string[] {
  const tools: string[] = [];
  const allDeps = { ...dependencies.production, ...dependencies.development, ...dependencies.peer };

  for (const tool of REPOSITORY_ANALYSIS_CONSTANTS.BUILD_TOOLS) {
    if (tool.packages) {
      const hasPackage = tool.packages.some((pkg) => allDeps[pkg]);
      if (hasPackage) {
        tools.push(tool.name);
      }
    }
  }

  return tools;
}

export function detectTestFrameworks(dependencies: Dependencies): string[] {
  const tests: string[] = [];
  const allDeps = { ...dependencies.production, ...dependencies.development, ...dependencies.peer };

  for (const test of REPOSITORY_ANALYSIS_CONSTANTS.TEST_FRAMEWORKS) {
    if (test.packages) {
      const hasPackage = test.packages.some((pkg) => allDeps[pkg]);
      if (hasPackage) {
        tests.push(test.name);
      }
    }
  }

  return tests;
}
