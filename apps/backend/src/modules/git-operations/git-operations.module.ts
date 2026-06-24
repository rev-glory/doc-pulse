import { Module } from '@nestjs/common';

import { GitService, RepositoryCloneService, WorkspaceService } from './services';

@Module({
  providers: [GitService, WorkspaceService, RepositoryCloneService],
  exports: [RepositoryCloneService],
})
export class GitOperationsModule {}
