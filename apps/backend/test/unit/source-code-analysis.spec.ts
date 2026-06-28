import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { SourceCodeAnalysisModule } from '../../src/modules/source-code-analysis/source-code-analysis.module';
import { SourceCodeAnalysisService } from '../../src/modules/source-code-analysis/services/source-code-analysis.service';

describe('SourceCodeAnalysis (Codebase Static Analysis)', () => {
  let service: SourceCodeAnalysisService;
  const tempTestRepoPath = path.join(__dirname, 'temp-test-codebase-analysis');

  beforeAll(async () => {
    // Build a mock workspace with node_modules, source files, and configs
    await fs.mkdir(tempTestRepoPath, { recursive: true });
    await fs.mkdir(path.join(tempTestRepoPath, 'src'), { recursive: true });
    await fs.mkdir(path.join(tempTestRepoPath, 'src/modules'), { recursive: true });
    await fs.mkdir(path.join(tempTestRepoPath, 'node_modules'), { recursive: true });

    // package.json dependency manifest
    const packageJson = {
      name: 'mock-app',
      dependencies: {
        '@nestjs/core': '^10.0.0',
        'prisma': '^5.0.0',
        'express': '^4.18.0',
      },
      devDependencies: {
        'typescript': '^5.0.0',
        'jest': '^29.0.0',
      },
    };
    await fs.writeFile(
      path.join(tempTestRepoPath, 'package.json'),
      JSON.stringify(packageJson, null, 2),
    );

    // ignored files/directories to make sure they are not scanned
    await fs.writeFile(
      path.join(tempTestRepoPath, 'node_modules/some-lib.js'),
      'console.log("ignored");',
    );

    // TypeScript Entry point
    await fs.writeFile(
      path.join(tempTestRepoPath, 'src/main.ts'),
      `
      import { NestFactory } from '@nestjs/core';
      import { AppModule } from './app.module';
      async function bootstrap() {
        const app = await NestFactory.create(AppModule);
        await app.listen(3000);
      }
      bootstrap();
      `,
    );

    // NestJS Controller file
    await fs.writeFile(
      path.join(tempTestRepoPath, 'src/modules/auth.controller.ts'),
      `
      import { Controller, Get, Post } from '@nestjs/common';
      @Controller('auth')
      export class AuthController {
        @Post('login')
        async login() {}

        @Get('profile')
        async profile() {}
      }
      `,
    );

    // NestJS Service file
    await fs.writeFile(
      path.join(tempTestRepoPath, 'src/modules/auth.service.ts'),
      `
      import { Injectable } from '@nestjs/common';
      @Injectable()
      export class AuthService {
        async validateUser() {}
      }
      `,
    );

    // docker-compose config
    await fs.writeFile(
      path.join(tempTestRepoPath, 'docker-compose.yml'),
      'version: "3.8"',
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SourceCodeAnalysisModule],
    }).compile();

    service = moduleFixture.get<SourceCodeAnalysisService>(SourceCodeAnalysisService);
  });

  afterAll(async () => {
    // Cleanup temporary repo
    await fs.rm(tempTestRepoPath, { recursive: true, force: true });
  });

  it('should compile and be defined', () => {
    expect(service).toBeDefined();
  });

  it('should statically analyze the mock codebase and build a structured SourceCodeAnalysis object', async () => {
    const analysis = await service.analyzeRepository(tempTestRepoPath);

    expect(analysis).toBeDefined();
    expect(analysis.analysisVersion).toBe(1);

    // Assert that ignored directories (node_modules) are not indexed or in metrics
    expect(analysis.metrics.totalSourceFiles).toBe(3); // main.ts, auth.controller.ts, auth.service.ts

    // Technology confidence score detections
    expect(analysis.technologies).toContainEqual({
      name: 'NestJS',
      category: 'framework',
      confidence: 1.0,
    });
    expect(analysis.technologies).toContainEqual({
      name: 'TypeScript',
      category: 'language',
      confidence: 1.0,
    });
    expect(analysis.technologies).toContainEqual({
      name: 'Prisma ORM',
      category: 'database',
      confidence: 1.0,
    });

    // Dependency categorization summary
    expect(finalDepsProductionIncludes(analysis.dependencies.production, '@nestjs/core')).toBe(true);
    expect(analysis.dependencies.frameworks).toContain('NestJS');
    expect(analysis.dependencies.databases).toContain('Prisma ORM');

    // Architecture details mapping
    expect(analysis.architecture.style).toBe('NestJS Modular Architecture');
    expect(analysis.architecture.patterns).toContain('Dependency Injection');

    // Discovered API Route Endpoints
    expect(analysis.apiEndpoints.length).toBe(2);
    expect(analysis.apiEndpoints).toContainEqual({
      method: 'POST',
      path: '/auth/login',
      controller: 'src/modules/auth.controller.ts',
    });
    expect(analysis.apiEndpoints).toContainEqual({
      method: 'GET',
      path: '/auth/profile',
      controller: 'src/modules/auth.controller.ts',
    });

    // Module / Services and important files mapping
    expect(analysis.services).toContain('AuthService');
    expect(analysis.entryPoints).toContain('src/main.ts');
    expect(analysis.configurationFiles).toContain('package.json');
    expect(analysis.importantFiles.some((f) => f.path === 'docker-compose.yml')).toBe(true);

    // Complexity metrics calculation
    expect(analysis.metrics.serviceCount).toBe(1);
    expect(analysis.metrics.controllerCount).toBe(2);
  });
});

function finalDepsProductionIncludes(deps: string[], term: string): boolean {
  return deps.includes(term);
}
