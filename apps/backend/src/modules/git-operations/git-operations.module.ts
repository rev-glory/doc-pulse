import { Module, forwardRef } from '@nestjs/common';
import { GitHubModule } from '../github/github.module';

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
