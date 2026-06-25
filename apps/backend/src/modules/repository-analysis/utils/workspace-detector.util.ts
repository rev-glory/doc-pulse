import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { REPOSITORY_ANALYSIS_CONSTANTS } from '../constants/repository-analysis.constants';

export async function detectPackageManager(rootPath: string): Promise<string | null> {
  const entries = await fs.readdir(rootPath).catch(() => [] as string[]);
  
  for (const pm of REPOSITORY_ANALYSIS_CONSTANTS.PACKAGE_MANAGERS) {
    if (entries.includes(pm.lockfile)) {
      return pm.name;
    }
  }

  return null;
}

export async function detectMonorepoTools(rootPath: string): Promise<{ isMonorepo: boolean; tools: string[] }> {
  const tools: string[] = [];
  const entries = await fs.readdir(rootPath).catch(() => [] as string[]);

  for (const config of REPOSITORY_ANALYSIS_CONSTANTS.MONOREPO_CONFIGS) {
    if (entries.includes(config.file)) {
      tools.push(config.name);
    }
  }

  return {
    isMonorepo: tools.length > 0,
    tools,
  };
}

export async function detectDockerFiles(rootPath: string): Promise<string[]> {
  const dockerFiles: string[] = [];
  const entries = await fs.readdir(rootPath).catch(() => [] as string[]);

  for (const file of REPOSITORY_ANALYSIS_CONSTANTS.DOCKER_FILES) {
    if (entries.includes(file)) {
      dockerFiles.push(file);
    }
  }

  return dockerFiles;
}

export async function detectCiCd(rootPath: string): Promise<string[]> {
  const ciCdPaths: string[] = [];
  
  for (const ciPath of REPOSITORY_ANALYSIS_CONSTANTS.CI_CD_DIRECTORIES) {
    const fullPath = path.join(rootPath, ciPath);
    try {
      const stat = await fs.stat(fullPath);
      if (stat) {
        ciCdPaths.push(ciPath);
      }
    } catch {
      // Ignore if not found
    }
  }

  return ciCdPaths;
}

export async function detectWorkspaceFolders(rootPath: string): Promise<string[]> {
  const folders: string[] = [];
  
  for (const folder of REPOSITORY_ANALYSIS_CONSTANTS.WORKSPACE_FOLDERS) {
    const fullPath = path.join(rootPath, folder);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        folders.push(folder);
      }
    } catch {
      // Ignore if not found
    }
  }

  return folders;
}
