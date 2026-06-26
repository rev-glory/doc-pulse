import { Module } from '@nestjs/common';
import { PrismaModule } from '@/database';
import { PullRequestsController } from './controllers/pull-requests.controller';
import { PullRequestsService } from './services/pull-requests.service';

@Module({
  imports: [PrismaModule],
  controllers: [PullRequestsController],
  providers: [PullRequestsService],
  exports: [PullRequestsService],
})
export class PullRequestsModule {}
