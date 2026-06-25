import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  aiConfig,
  appConfig,
  databaseConfig,
  geminiConfig,
  githubConfig,
  jwtConfig,
  notificationConfig,
  queueConfig,
  redisConfig,
  storageConfig,
  validateEnv,
} from './config';
import { AiModule } from './modules/ai/ai.module';
import { PrismaModule } from './database';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { GitHubModule } from './modules/github/github.module';
import { RepositoriesModule } from './modules/repositories/repositories.module';
import { GitOperationsModule } from './modules/git-operations';
import { RepositoryAnalysisModule } from './modules/repository-analysis/repository-analysis.module';
import { WorkflowModule } from './modules/workflow';
import { QueueModule } from './modules/queue/queue.module';

@Module({
  imports: [
    // ── Global configuration ───────────────────────────────────────────────
    // isGlobal: true     → ConfigService is injectable in every module without
    //                      importing ConfigModule again.
    // validate           → Zod schema runs at bootstrap; app refuses to start
    //                      if any required variable is missing or invalid.
    // load               → Domain-namespaced factories registered as config
    //                      namespaces (e.g. ConfigService.get('database')).
    // envFilePath        → Path to the local .env file (development only).
    // ignoreEnvFile      → Set to true in production so that platform-injected
    //                      secrets (Railway, Fly.io, Docker) are never silently
    //                      overridden by a stale .env file on disk.
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        jwtConfig,
        githubConfig,
        aiConfig,
        geminiConfig,
        queueConfig,
        notificationConfig,
        storageConfig,
      ],
      envFilePath: ['../../.env'],
      ignoreEnvFile: process.env['NODE_ENV'] === 'production',
      expandVariables: false,
    }),

    AiModule,
    PrismaModule,
    QueueModule,
    HealthModule,
    AuthModule,
    UsersModule,
    GitHubModule,
    RepositoriesModule,
    GitOperationsModule,
    RepositoryAnalysisModule,
    WorkflowModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

