import { Module } from '@nestjs/common';

import {
  GitService,
  RepositoryCloneService,
  WorkspaceService,
  RepositoryLockService,
} from './services';

@Module({
  providers: [GitService, WorkspaceService, RepositoryCloneService, RepositoryLockService],
  exports: [RepositoryCloneService, WorkspaceService],
})
export class GitOperationsModule {}
