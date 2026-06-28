import { Module, forwardRef } from '@nestjs/common';
import { GitHubModule } from '../github/github.module';
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
} from './services';

@Module({
  imports: [
    forwardRef(() => GitHubModule),
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
  ],
  exports: [RepositoryCloneService, WorkspaceService, DocumentationWriterService, GitOperationsService, WorkspaceLifecycleService],
})
export class GitOperationsModule {}
