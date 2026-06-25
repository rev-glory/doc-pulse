import { Injectable, Logger } from '@nestjs/common';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { RepositorySummary, RepositoryMetrics } from '../../../domain/repository';
import { DocumentationInventory } from '../../../domain/documentation';
import { parsePackageJson } from '../utils/package-json.util';
import {
  detectLanguages,
  detectFrameworks,
  detectBuildTools,
  detectTestFrameworks,
} from '../utils/framework-detector.util';
import {
  detectPackageManager,
  detectMonorepoTools,
  detectDockerFiles,
  detectCiCd,
  detectWorkspaceFolders,
} from '../utils/workspace-detector.util';
import {
  detectDocumentation,
  detectEnvironmentFiles,
  detectApiSpecifications,
  buildDocumentationInventory,
} from '../utils/documentation-detector.util';
import { REPOSITORY_ANALYSIS_CONSTANTS } from '../constants/repository-analysis.constants';

@Injectable()
export class RepositoryAnalysisService {
  private readonly logger = new Logger(RepositoryAnalysisService.name);

  public async analyzeRepository(rootPath: string): Promise<RepositorySummary> {
    this.logger.debug(`Starting analysis for repository at: ${rootPath}`);

    // Verify root path exists
    try {
      const stat = await fs.stat(rootPath);
      if (!stat.isDirectory()) {
        throw new Error(`Path is not a directory: ${rootPath}`);
      }
    } catch (error) {
      throw new Error(`Invalid repository root path: ${rootPath}`);
    }

    const packageJsonData = await parsePackageJson(rootPath);
    const dependencies = packageJsonData?.dependencies || [];
    const scripts = packageJsonData?.scripts || {};
    const name = packageJsonData?.name || path.basename(rootPath);

    const [
      languages,
      frameworks,
      buildTools,
      testFrameworks,
      packageManager,
      monorepoData,
      dockerFiles,
      ciCdFiles,
      workspaceFolders,
      documentation,
      environmentFiles,
      apiSpecifications,
    ] = await Promise.all([
      detectLanguages(rootPath),
      Promise.resolve(detectFrameworks(dependencies)),
      Promise.resolve(detectBuildTools(dependencies)),
      Promise.resolve(detectTestFrameworks(dependencies)),
      detectPackageManager(rootPath),
      detectMonorepoTools(rootPath),
      detectDockerFiles(rootPath),
      detectCiCd(rootPath),
      detectWorkspaceFolders(rootPath),
      detectDocumentation(rootPath),
      detectEnvironmentFiles(rootPath),
      detectApiSpecifications(rootPath),
    ]);

    const metrics: RepositoryMetrics = {
      packageCount: await this.calculatePackageCount(rootPath, workspaceFolders),
      documentationCount: documentation.length,
      configurationFileCount: await this.calculateConfigurationFileCount(rootPath),
      workspaceCount: workspaceFolders.length,
    };

    return {
      rootPath,
      name,
      isMonorepo: monorepoData.isMonorepo,
      packageManager,
      languages,
      frameworks,
      buildTools,
      testFrameworks,
      dependencies,
      scripts,
      workspaceType: monorepoData.isMonorepo ? monorepoData.tools[0] || 'unknown' : null,
      dockerSupport: dockerFiles,
      ciCdSupport: ciCdFiles,
      documentation,
      environmentFiles,
      apiSpecifications,
      workspaceFolders,
      metrics,
    };
  }

  public async analyzeDocumentation(rootPath: string): Promise<DocumentationInventory> {
    this.logger.debug(`Starting documentation analysis for repository at: ${rootPath}`);

    // Verify root path exists
    try {
      const stat = await fs.stat(rootPath);
      if (!stat.isDirectory()) {
        throw new Error(`Path is not a directory: ${rootPath}`);
      }
    } catch (error) {
      throw new Error(`Invalid repository root path: ${rootPath}`);
    }

    return buildDocumentationInventory(rootPath);
  }

  private async calculatePackageCount(rootPath: string, workspaceFolders: string[]): Promise<number> {
    let count = 0;
    
    // Root package.json
    try {
      const rootPkg = await fs.stat(path.join(rootPath, 'package.json'));
      if (rootPkg.isFile()) {
        count++;
      }
    } catch {
      // Ignore
    }

    // Packages in workspaces
    for (const folder of workspaceFolders) {
      const folderPath = path.join(rootPath, folder);
      try {
        const entries = await fs.readdir(folderPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const pkgPath = path.join(folderPath, entry.name, 'package.json');
            try {
              const stat = await fs.stat(pkgPath);
              if (stat.isFile()) count++;
            } catch {
              // Ignore
            }
          }
        }
      } catch {
        // Ignore
      }
    }

    return count;
  }

  private async calculateConfigurationFileCount(rootPath: string): Promise<number> {
    try {
      const entries = await fs.readdir(rootPath);
      let count = 0;
      
      const configExtensions = ['.json', '.yaml', '.yml', '.toml', '.xml', 'rc'];
      const configFiles = ['.env', 'Makefile', 'Dockerfile'];

      for (const entry of entries) {
        if (configExtensions.some(ext => entry.endsWith(ext)) || configFiles.some(f => entry.startsWith(f))) {
          count++;
        }
      }
      
      return count;
    } catch {
      return 0;
    }
  }
}
