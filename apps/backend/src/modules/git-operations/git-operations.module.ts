import { Module } from '@nestjs/common';

import {
  GitService,
  RepositoryCloneService,
  WorkspaceService,
  RepositoryLockService,
  DocumentationWriterService,
  GitOperationsService,
} from './services';

@Module({
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
