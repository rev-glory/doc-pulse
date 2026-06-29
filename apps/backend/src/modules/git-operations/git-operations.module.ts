import { Module, forwardRef } from '@nestjs/common';
import { GitHubModule } from '../github/github.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { GIT_PROVIDER } from './interfaces/git-provider.interface';
import { SimpleGitProvider } from './providers/simple-git/simple-git.provider';

import {
  GitService,
  RepositoryCloneService,
  WorkspaceService,
  RepositoryLockService,
  DocumentationWriterService,
  GitOperationsService,
  WorkspaceLifecycleService,
  WorkspaceCleanupService,
} from './services';

@Module({
  imports: [
    forwardRef(() => GitHubModule),
    forwardRef(() => RepositoriesModule),
  ],
  providers: [
    {
      provide: GIT_PROVIDER,
      useClass: SimpleGitProvider,
    },
    GitService,
    WorkspaceService,
    RepositoryCloneService,
    RepositoryLockService,
    DocumentationWriterService,
    GitOperationsService,
    WorkspaceLifecycleService,
    WorkspaceCleanupService,
  ],
  exports: [
    RepositoryCloneService,
    WorkspaceService,
    DocumentationWriterService,
    GitOperationsService,
    WorkspaceLifecycleService,
    WorkspaceCleanupService,
  ],
})
export class GitOperationsModule {}
