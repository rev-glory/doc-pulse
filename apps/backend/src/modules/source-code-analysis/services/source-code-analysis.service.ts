import { Injectable, Logger } from '@nestjs/common';
import { RepositoryScannerService } from './repository-scanner.service';
import { TypeScriptAnalyzerService } from './language-analyzers/typescript-analyzer.service';
import { DependencyAnalyzerService } from './analyzers/dependency-analyzer.service';
import { ArchitectureAnalyzerService } from './analyzers/architecture-analyzer.service';
import { SourceCodeAnalysis, ComplexityMetrics } from '../../../domain/source-code-analysis/source-code-analysis';

@Injectable()
export class SourceCodeAnalysisService {
  private readonly logger = new Logger(SourceCodeAnalysisService.name);

  constructor(
    private readonly scanner: RepositoryScannerService,
    private readonly tsAnalyzer: TypeScriptAnalyzerService,
    private readonly depAnalyzer: DependencyAnalyzerService,
    private readonly archAnalyzer: ArchitectureAnalyzerService,
  ) {}

  public async analyzeRepository(rootPath: string): Promise<SourceCodeAnalysis> {
    this.logger.log(`Starting source codebase static analysis orchestration for: ${rootPath}`);
    const index = await this.scanner.buildIndex(rootPath);

    const analyzers = [
      this.tsAnalyzer,
      this.depAnalyzer,
      this.archAnalyzer,
    ];

    let merged: Partial<SourceCodeAnalysis> = {
      analysisVersion: 1,
    };

    for (const analyzer of analyzers) {
      if (analyzer.supports(index)) {
        try {
          const partial = await analyzer.analyze(index);
          merged = this.mergePartialAnalysis(merged, partial);
        } catch (err) {
          this.logger.error(`Codebase analyzer failed during run:`, err);
        }
      }
    }

    return this.finalizeAndEnforceLimits(merged, index.files.length);
  }

  private mergePartialAnalysis(
    target: Partial<SourceCodeAnalysis>,
    source: Partial<SourceCodeAnalysis>,
  ): Partial<SourceCodeAnalysis> {
    const result = { ...target };

    // 1. Merge architecture
    if (source.architecture) {
      result.architecture = {
        style: source.architecture.style || target.architecture?.style || 'Generic App',
        patterns: this.mergeStringArrays(target.architecture?.patterns, source.architecture.patterns),
        layers: this.mergeStringArrays(target.architecture?.layers, source.architecture.layers),
        moduleStructure: this.mergeStringArrays(target.architecture?.moduleStructure, source.architecture.moduleStructure),
      };
    }

    // 2. Merge dependencies
    if (source.dependencies) {
      result.dependencies = {
        production: this.mergeStringArrays(target.dependencies?.production, source.dependencies.production),
        development: this.mergeStringArrays(target.dependencies?.development, source.dependencies.development),
        frameworks: this.mergeStringArrays(target.dependencies?.frameworks, source.dependencies.frameworks),
        databases: this.mergeStringArrays(target.dependencies?.databases, source.dependencies.databases),
      };
    }

    // 3. Merge tech (DetectedTechnology objects)
    if (source.technologies) {
      const existing = target.technologies || [];
      const incoming = source.technologies;
      const mergedTechMap = new Map<string, typeof incoming[0]>();
      for (const t of [...existing, ...incoming]) {
        // Keep highest confidence for duplicates
        const prev = mergedTechMap.get(t.name);
        if (!prev || t.confidence > prev.confidence) {
          mergedTechMap.set(t.name, t);
        }
      }
      result.technologies = Array.from(mergedTechMap.values());
    }

    // 4. Merge string lists
    if (source.modules) result.modules = this.mergeStringArrays(target.modules, source.modules);
    if (source.services) result.services = this.mergeStringArrays(target.services, source.services);
    if (source.database) result.database = this.mergeStringArrays(target.database, source.database);
    if (source.entryPoints) result.entryPoints = this.mergeStringArrays(target.entryPoints, source.entryPoints);
    if (source.configurationFiles) result.configurationFiles = this.mergeStringArrays(target.configurationFiles, source.configurationFiles);
    if (source.importantDirectories) result.importantDirectories = this.mergeStringArrays(target.importantDirectories, source.importantDirectories);

    // 5. Merge ApiEndpoints
    if (source.apiEndpoints) {
      const existing = target.apiEndpoints || [];
      const mergedApis = [...existing];
      for (const ep of source.apiEndpoints) {
        if (!mergedApis.some((ex) => ex.method === ep.method && ex.path === ep.path)) {
          mergedApis.push(ep);
        }
      }
      result.apiEndpoints = mergedApis;
    }

    // 6. Merge ImportantFiles
    if (source.importantFiles) {
      const existing = target.importantFiles || [];
      const mergedFiles = [...existing];
      for (const f of source.importantFiles) {
        if (!mergedFiles.some((ex) => ex.path === f.path)) {
          mergedFiles.push(f);
        }
      }
      result.importantFiles = mergedFiles;
    }

    // 7. Merge metrics
    if (source.metrics) {
      const targetMetrics = target.metrics || {
        totalSourceFiles: 0,
        controllerCount: 0,
        serviceCount: 0,
        moduleCount: 0,
        interfaceCount: 0,
        classCount: 0,
        testCount: 0,
      };
      result.metrics = {
        totalSourceFiles: Math.max(targetMetrics.totalSourceFiles, source.metrics.totalSourceFiles),
        controllerCount: Math.max(targetMetrics.controllerCount, source.metrics.controllerCount),
        serviceCount: Math.max(targetMetrics.serviceCount, source.metrics.serviceCount),
        moduleCount: Math.max(targetMetrics.moduleCount, source.metrics.moduleCount),
        interfaceCount: Math.max(targetMetrics.interfaceCount, source.metrics.interfaceCount),
        classCount: Math.max(targetMetrics.classCount, source.metrics.classCount),
        testCount: Math.max(targetMetrics.testCount, source.metrics.testCount),
      };
    }

    return result;
  }

  private mergeStringArrays(arr1?: string[], arr2?: string[]): string[] {
    const set = new Set([...(arr1 || []), ...(arr2 || [])]);
    return Array.from(set);
  }

  private finalizeAndEnforceLimits(partial: Partial<SourceCodeAnalysis>, indexedFileCount: number): SourceCodeAnalysis {
    const finalArch = partial.architecture || {
      style: 'Generic App',
      patterns: [],
      layers: [],
      moduleStructure: [],
    };

    const finalDeps = partial.dependencies || {
      production: [],
      development: [],
      frameworks: [],
      databases: [],
    };

    const finalMetrics: ComplexityMetrics = partial.metrics || {
      totalSourceFiles: indexedFileCount,
      controllerCount: 0,
      serviceCount: 0,
      moduleCount: 0,
      interfaceCount: 0,
      classCount: 0,
      testCount: 0,
    };

    // Calculate moduleCount from architecture directories and modules list
    finalMetrics.moduleCount = Math.max(finalMetrics.moduleCount, partial.modules?.length || 0, finalArch.moduleStructure.length);

    // Build finalized bounded-size arrays matching constraints
    return {
      analysisVersion: 1,
      architecture: {
        style: finalArch.style,
        patterns: finalArch.patterns.slice(0, 10),
        layers: finalArch.layers.slice(0, 10),
        moduleStructure: finalArch.moduleStructure.slice(0, 20),
      },
      technologies: (partial.technologies || []).slice(0, 100),
      modules: (partial.modules || []).slice(0, 50),
      services: (partial.services || []).slice(0, 50),
      apiEndpoints: (partial.apiEndpoints || []).slice(0, 50),
      database: (partial.database || []).slice(0, 50),
      dependencies: {
        production: finalDeps.production.slice(0, 50),
        development: finalDeps.development.slice(0, 50),
        frameworks: finalDeps.frameworks.slice(0, 10),
        databases: finalDeps.databases.slice(0, 10),
      },
      entryPoints: (partial.entryPoints || []).slice(0, 20),
      configurationFiles: (partial.configurationFiles || []).slice(0, 10),
      importantFiles: (partial.importantFiles || []).slice(0, 100),
      importantDirectories: (partial.importantDirectories || []).slice(0, 50),
      metrics: finalMetrics,
    };
  }
}
