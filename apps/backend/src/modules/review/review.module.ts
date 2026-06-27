import { Module } from '@nestjs/common';
import { PrismaModule } from '@/database';
import { QueueModule } from '../queue/queue.module';
import { GitOperationsModule } from '../git-operations/git-operations.module';
import { ReviewsController } from './controllers/reviews.controller';
import { ReviewsService } from './services/reviews.service';

@Module({
  imports: [PrismaModule, QueueModule, GitOperationsModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewModule {}
