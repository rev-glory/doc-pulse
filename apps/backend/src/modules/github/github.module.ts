import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { githubConfig } from '@/config';
import { PrismaModule } from '@/database';
import { RepositoriesModule } from '@/modules/repositories/repositories.module';
import { WebhookEventsModule } from '@/modules/webhook-events/webhook-events.module';
// TODO(queue-infrastructure): Re-add QueueModule import once the Queue module is implemented.

import { GitHubController } from './controllers/github.controller';
import { GitHubWebhooksController } from './controllers/github-webhooks.controller';
import { GitHubAuthService } from './services/github-auth.service';
import { GitHubApiService } from './services/github-api.service';
import { GitHubInstallationService } from './services/github-installation.service';
import { GitHubRepositoryService } from './services/github-repository.service';
import { GitHubWebhookService } from './services/github-webhook.service';
import { PullRequestTemplateService } from './services/pull-request-template.service';
import { PullRequestService } from './services/pull-request.service';
import { InstallationsPersistence } from './persistence/installations.persistence';

@Module({
  imports: [
    ConfigModule.forFeature(githubConfig),
    PrismaModule,
    forwardRef(() => RepositoriesModule),
    WebhookEventsModule,
  ],
  controllers: [GitHubController, GitHubWebhooksController],
  providers: [
    GitHubAuthService,
    GitHubApiService,
    GitHubInstallationService,
    GitHubRepositoryService,
    GitHubWebhookService,
    PullRequestTemplateService,
    PullRequestService,
    InstallationsPersistence,
  ],
  exports: [
    GitHubAuthService,
    GitHubApiService,
    GitHubInstallationService,
    GitHubRepositoryService,
    PullRequestService,
    InstallationsPersistence,
  ],
})
export class GitHubModule {}
