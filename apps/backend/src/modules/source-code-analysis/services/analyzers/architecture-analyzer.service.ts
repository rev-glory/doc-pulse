import { Injectable, Logger } from "@nestjs/common";
import { CodebaseAnalyzer } from "../../interfaces/analyzer.interface";
import { RepositoryIndex } from "../repository-scanner.service";
import {
  SourceCodeAnalysis,
  ArchitectureAnalysis,
  ImportantFile,
} from "../../../../domain/source-code-analysis/source-code-analysis";

@Injectable()
export class ArchitectureAnalyzerService implements CodebaseAnalyzer {
  private readonly logger = new Logger(ArchitectureAnalyzerService.name);

  public supports(_index: RepositoryIndex): boolean {
    return true; // Generic analyzer that can inspect any codebase files index
  }

  public async analyze(
    index: RepositoryIndex,
  ): Promise<Partial<SourceCodeAnalysis>> {
    this.logger.debug("Starting architecture analysis...");

    const importantDirsSet = new Set<string>();
    const importantFiles: ImportantFile[] = [];
    const configurationFiles: string[] = [];

    const commonConfigFiles = {
      "tsconfig.json": "TypeScript Compiler Settings",
      "package.json": "Node.js Package Manifest",
      "docker-compose.yml": "Docker Orchestration Configuration",
      "docker-compose.yaml": "Docker Orchestration Configuration",
      dockerfile: "Docker Build Instructions",
      "nest-cli.json": "NestJS Command Line Config",
      "next.config.js": "Next.js App Configurations",
      "next.config.mjs": "Next.js App Configurations",
      "vite.config.ts": "Vite Build Bundler Config",
      "vite.config.js": "Vite Build Bundler Config",
      "eslint.config.js": "ESLint Linting Rules",
      ".eslintrc.json": "ESLint Linting Rules",
      ".eslintrc.js": "ESLint Linting Rules",
      "prettier.config.js": "Prettier Formatting Config",
      ".prettierrc": "Prettier Formatting Config",
      "webpack.config.js": "Webpack Bundler Config",
    };

    const importantFileNames = {
      "main.ts": "Entry point for NestJS application bootstrap",
      "main.go": "Go application bootstrap entry point",
      "main.py": "Python execution entry point",
      "app.ts": "Express/HTTP server initialization entry point",
      "app.js": "Express/HTTP server initialization entry point",
      "server.ts": "Server bootstrap entry point",
      "server.js": "Server bootstrap entry point",
      ".env.example": "Environment configuration template",
      "schema.prisma": "Prisma database schema definitions",
      "readme.md": "Main codebase README documentation",
    };

    for (const file of index.files) {
      const name = file.relativePath.split("/").pop()?.toLowerCase() || "";

      // 1. Gather configuration files
      if (commonConfigFiles[name as keyof typeof commonConfigFiles]) {
        if (configurationFiles.length < 10) {
          configurationFiles.push(file.relativePath);
        }
        if (importantFiles.length < 100) {
          importantFiles.push({
            path: file.relativePath,
            reason: commonConfigFiles[name as keyof typeof commonConfigFiles]!,
          });
        }
      }

      // 2. Gather important files
      if (importantFileNames[name as keyof typeof importantFileNames]) {
        if (
          importantFiles.length < 100 &&
          !importantFiles.some((f) => f.path === file.relativePath)
        ) {
          importantFiles.push({
            path: file.relativePath,
            reason:
              importantFileNames[name as keyof typeof importantFileNames]!,
          });
        }
      }

      // 3. Extract folders up to depth 3
      const parts = file.relativePath.split("/");
      if (parts.length > 1) {
        // Parent folder relative paths
        for (let i = 1; i <= Math.min(3, parts.length - 1); i++) {
          const folderPath = parts.slice(0, i).join("/");
          importantDirsSet.add(folderPath);
        }
      }
    }

    const importantDirectories = Array.from(importantDirsSet).slice(0, 50);

    // 4. Infer architectural details from directories
    const styles: string[] = [];
    const patterns: string[] = [];
    const layers: string[] = [];
    const moduleStructure: string[] = [];

    const dirsStr = importantDirectories.join("\n").toLowerCase();

    // Guess architectural style
    if (dirsStr.includes("apps/") || dirsStr.includes("packages/")) {
      styles.push("Monorepo Workspace");
    }

    if (dirsStr.includes("src/modules")) {
      styles.push("NestJS Modular Architecture");
      patterns.push(
        "Dependency Injection",
        "Repository Pattern",
        "Decorator-driven Routing",
      );
      layers.push(
        "Controllers (REST API)",
        "Services (Business Logic)",
        "Modules (Context Boundaries)",
        "Database Layer (ORMs)",
      );
    } else if (
      dirsStr.includes("controllers") &&
      dirsStr.includes("services")
    ) {
      styles.push("Controller-Service-Repository Pattern");
      layers.push("Controller Router Layer", "Service Business Logic Layer");
    } else if (
      dirsStr.includes("src/components") ||
      dirsStr.includes("src/pages")
    ) {
      styles.push("Component-Based Frontend");
    } else {
      styles.push("Standard Single-Package Application");
    }

    if (dirsStr.includes("models") || dirsStr.includes("entities")) {
      layers.push("Entity/Model Persistence Layer");
    }
    if (
      dirsStr.includes("middleware") ||
      dirsStr.includes("guards") ||
      dirsStr.includes("interceptors")
    ) {
      layers.push("Middleware / Interceptor Security Layer");
    }

    // Default fallbacks to prevent empty arrays
    if (styles.length === 0) styles.push("Generic App");
    if (patterns.length === 0) patterns.push("Standard MVC");
    if (layers.length === 0) layers.push("Root Source");

    const architecture: ArchitectureAnalysis = {
      style: styles[0]!,
      patterns,
      layers,
      moduleStructure: importantDirectories.filter(
        (d) => d.includes("module") || d.split("/").length === 1,
      ),
    };

    return {
      architecture,
      configurationFiles,
      importantFiles,
      importantDirectories,
      modules: importantDirectories
        .filter(
          (d) =>
            d.startsWith("src/modules") ||
            (d.includes("modules") && d.split("/").length === 2),
        )
        .slice(0, 50),
    };
  }
}
