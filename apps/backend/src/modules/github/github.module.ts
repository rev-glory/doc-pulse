import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { githubConfig } from '@/config';

import { GitHubController } from './controllers/github.controller';
import { GitHubAuthService } from './services/github-auth.service';
import { GitHubApiService } from './services/github-api.service';
import { GitHubService } from './services/github.service';

@Module({
  imports: [ConfigModule.forFeature(githubConfig)],
  controllers: [GitHubController],
  providers: [GitHubAuthService, GitHubApiService, GitHubService],
  exports: [GitHubAuthService, GitHubApiService, GitHubService],
})
export class GitHubModule {}
