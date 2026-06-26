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
  workflowConfig,
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
import { RealtimeModule } from './modules/realtime/realtime.module';
import { RunsModule } from './modules/runs/runs.module';
import { PullRequestsModule } from './modules/pull-requests/pull-requests.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
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
        workflowConfig,
      ],
      envFilePath: ['../../.env'],
      ignoreEnvFile: process.env['NODE_ENV'] === 'production',
      expandVariables: false,
    }),

    RealtimeModule,
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
    RunsModule,
    PullRequestsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


