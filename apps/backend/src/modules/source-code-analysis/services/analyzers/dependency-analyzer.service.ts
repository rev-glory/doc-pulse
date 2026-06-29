import { Injectable, Logger } from "@nestjs/common";
import { CodebaseAnalyzer } from "../../interfaces/analyzer.interface";
import {
  RepositoryIndex,
  RepositoryScannerService,
} from "../repository-scanner.service";
import {
  SourceCodeAnalysis,
  DependencySummary,
  DetectedTechnology,
} from "../../../../domain/source-code-analysis/source-code-analysis";

@Injectable()
export class DependencyAnalyzerService implements CodebaseAnalyzer {
  private readonly logger = new Logger(DependencyAnalyzerService.name);

  constructor(private readonly scanner: RepositoryScannerService) {}

  public supports(index: RepositoryIndex): boolean {
    return index.files.some((f) => f.relativePath === "package.json");
  }

  public async analyze(
    index: RepositoryIndex,
  ): Promise<Partial<SourceCodeAnalysis>> {
    this.logger.debug("Starting dependency analysis...");

    const production: string[] = [];
    const development: string[] = [];
    const frameworks: string[] = [];
    const databases: string[] = [];
    const technologies: DetectedTechnology[] = [];

    const packageJsonFile = index.files.find(
      (f) => f.relativePath === "package.json",
    );
    if (!packageJsonFile) {
      return {};
    }

    try {
      const content = await this.scanner.readFile(
        index,
        packageJsonFile.relativePath,
      );
      const pkg = JSON.parse(content);

      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};

      // 1. Gather production dependencies
      for (const name of Object.keys(deps)) {
        if (production.length < 50) {
          production.push(name);
        }
      }

      // 2. Gather dev dependencies
      for (const name of Object.keys(devDeps)) {
        if (development.length < 50) {
          development.push(name);
        }
      }

      // 3. Detect Frameworks, Databases, and Technologies
      const frameworkKeywords = {
        nestjs: "NestJS",
        express: "Express",
        react: "React",
        next: "Next.js",
        vue: "Vue",
        angular: "Angular",
        fastify: "Fastify",
        koa: "Koa",
      };

      const databaseKeywords = {
        prisma: "Prisma ORM",
        mongoose: "Mongoose",
        typeorm: "TypeORM",
        sequelize: "Sequelize",
        pg: "PostgreSQL Driver",
        mysql: "MySQL Driver",
        redis: "Redis Driver",
        mongodb: "MongoDB Driver",
      };

      // Scan production and dev dependencies
      const allDeps = { ...deps, ...devDeps };

      for (const [depName, version] of Object.entries(allDeps)) {
        const lowerName = depName.toLowerCase();

        // Check framework matches
        for (const [kw, name] of Object.entries(frameworkKeywords)) {
          if (lowerName.includes(kw) && !frameworks.includes(name)) {
            if (frameworks.length < 50) frameworks.push(name);
            technologies.push({ name, category: "framework", confidence: 1.0 });
          }
        }

        // Check database matches
        for (const [kw, name] of Object.entries(databaseKeywords)) {
          if (lowerName.includes(kw) && !databases.includes(name)) {
            if (databases.length < 50) databases.push(name);
            technologies.push({ name, category: "database", confidence: 1.0 });
          }
        }
      }

      // Add project runtime/language technologies
      if (allDeps["typescript"]) {
        technologies.push({
          name: "TypeScript",
          category: "language",
          confidence: 1.0,
        });
      } else if (
        index.files.some((f) => f.extension === ".ts" || f.extension === ".tsx")
      ) {
        technologies.push({
          name: "TypeScript",
          category: "language",
          confidence: 0.95,
        });
      }

      if (
        index.files.some((f) => f.extension === ".js" || f.extension === ".jsx")
      ) {
        technologies.push({
          name: "JavaScript",
          category: "language",
          confidence: 0.9,
        });
      }

      if (allDeps["tailwindcss"]) {
        technologies.push({
          name: "Tailwind CSS",
          category: "styling",
          confidence: 1.0,
        });
      }

      if (allDeps["graphql"]) {
        technologies.push({
          name: "GraphQL",
          category: "api-protocol",
          confidence: 1.0,
        });
      }
    } catch (err) {
      this.logger.error("Failed to parse package.json dependencies", err);
    }

    const dependencies: DependencySummary = {
      production,
      development,
      frameworks,
      databases,
    };

    return {
      dependencies,
      technologies: technologies.slice(0, 100),
      database: databases,
    };
  }
}
