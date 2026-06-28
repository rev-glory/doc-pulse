import { Injectable, Logger } from '@nestjs/common';
import { CodebaseAnalyzer } from '../../interfaces/analyzer.interface';
import { RepositoryIndex, RepositoryScannerService } from '../repository-scanner.service';
import { SourceCodeAnalysis, ApiEndpoint } from '../../../../domain/source-code-analysis/source-code-analysis';

@Injectable()
export class TypeScriptAnalyzerService implements CodebaseAnalyzer {
  private readonly logger = new Logger(TypeScriptAnalyzerService.name);

  constructor(private readonly scanner: RepositoryScannerService) {}

  public supports(index: RepositoryIndex): boolean {
    // Supports if there are .ts, .tsx, .js, or package.json files
    return index.files.some(
      (f) =>
        f.extension === '.ts' ||
        f.extension === '.tsx' ||
        f.extension === '.js' ||
        f.relativePath === 'package.json',
    );
  }

  public async analyze(index: RepositoryIndex): Promise<Partial<SourceCodeAnalysis>> {
    this.logger.debug('Starting TypeScript static analysis...');

    const apiEndpoints: ApiEndpoint[] = [];
    const services: string[] = [];
    const entryPoints: string[] = [];
    const classes: string[] = [];
    const interfaces: string[] = [];
    const functions: string[] = [];
    let totalSourceFiles = 0;

    // Scan for entry points by extension/name
    const commonEntryPatterns = [
      /main\.(ts|js)$/,
      /index\.(ts|js)$/,
      /app\.(ts|js)$/,
      /server\.(ts|js)$/,
    ];

    for (const file of index.files) {
      if (file.extension === '.ts' || file.extension === '.tsx' || file.extension === '.js') {
        totalSourceFiles++;

        if (commonEntryPatterns.some((pattern) => pattern.test(file.relativePath)) && entryPoints.length < 20) {
          entryPoints.push(file.relativePath);
        }

        // Limit reading to files under 100KB to run quickly and protect memory
        if (file.size < 100 * 1024) {
          const content = await this.scanner.readFile(index, file.relativePath);

          // NestJS Decorator matching
          const controllerMatch = content.match(/@Controller\s*\(\s*['"`](.*?)['"`]\s*\)/);
          if (controllerMatch) {
            const basePath = controllerMatch[1] || '';
            const routeMatches = content.matchAll(/@(Get|Post|Put|Delete|Patch)\s*\(\s*(?:['"`](.*?)['"`])?\s*\)/g);
            for (const rMatch of routeMatches) {
              if (apiEndpoints.length >= 50) break;
              const method = rMatch[1]!.toUpperCase();
              const subPath = rMatch[2] || '';
              const path = `/${basePath}/${subPath}`.replace(/\/+/g, '/').replace(/\/$/, '');
              apiEndpoints.push({
                method,
                path: path || '/',
                controller: file.relativePath,
              });
            }
          }

          // Express Router matching
          const expressRouteMatches = content.matchAll(/(?:app|router|route)\.(get|post|put|delete|patch)\s*\(\s*['"`](.*?)['"`]/g);
          for (const exMatch of expressRouteMatches) {
            if (apiEndpoints.length >= 50) break;
            const method = exMatch[1]!.toUpperCase();
            const path = exMatch[2] || '/';
            // Avoid duplicate endpoints
            if (!apiEndpoints.some((ep) => ep.method === method && ep.path === path)) {
              apiEndpoints.push({
                method,
                path,
                controller: file.relativePath,
              });
            }
          }

          // Extract classes
          const classMatches = content.matchAll(/class\s+([A-Z]\w+)/g);
          for (const cMatch of classMatches) {
            const className = cMatch[1]!;
            if (className.endsWith('Service') && services.length < 50) {
              services.push(className);
            }
            if (classes.length < 50 && !classes.includes(className)) {
              classes.push(className);
            }
          }

          // Extract interfaces
          const interfaceMatches = content.matchAll(/interface\s+([A-Z]\w+)/g);
          for (const iMatch of interfaceMatches) {
            const interfaceName = iMatch[1]!;
            if (interfaces.length < 50 && !interfaces.includes(interfaceName)) {
              interfaces.push(interfaceName);
            }
          }

          // Extract functions
          const functionMatches = content.matchAll(/(?:function|const)\s+(\w+)\s*=\s*(?:async\s*)?\(/g);
          for (const fMatch of functionMatches) {
            const funcName = fMatch[1]!;
            if (functions.length < 50 && !functions.includes(funcName) && funcName.length > 2) {
              functions.push(funcName);
            }
          }
        }
      }
    }

    return {
      apiEndpoints,
      services,
      entryPoints,
      metrics: {
        totalSourceFiles,
        controllerCount: apiEndpoints.filter((ep) => ep.controller).length,
        serviceCount: services.length,
        moduleCount: 0, // Injected by other parts/aggregators if needed
        interfaceCount: interfaces.length,
        classCount: classes.length,
        testCount: index.files.filter((f) => f.relativePath.includes('.spec.') || f.relativePath.includes('.test.')).length,
      },
    };
  }
}
