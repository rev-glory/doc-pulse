import { Module, forwardRef } from '@nestjs/common';
import { GitHubModule } from '../github/github.module';

import {
  GitService,
  RepositoryCloneService,
  WorkspaceService,
  RepositoryLockService,
  DocumentationWriterService,
  GitOperationsService,
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
  ],
  exports: [RepositoryCloneService, WorkspaceService, DocumentationWriterService, GitOperationsService],
})
export class GitOperationsModule {}
