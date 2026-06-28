import { Module, forwardRef } from '@nestjs/common';

import { PrismaModule } from '@/database';
import { GitHubModule } from '@/modules/github/github.module';
import { GitOperationsModule } from '../git-operations/git-operations.module';
import { RepositoriesController } from './controllers/repositories.controller';
import { RepositoriesService } from './services/repositories.service';
import { RepositoriesPersistence } from './persistence/repositories.persistence';

@Module({
  imports: [PrismaModule, forwardRef(() => GitHubModule), forwardRef(() => GitOperationsModule)],
  controllers: [RepositoriesController],
  providers: [RepositoriesService, RepositoriesPersistence],
  exports: [RepositoriesService, RepositoriesPersistence],
})
export class RepositoriesModule {}
