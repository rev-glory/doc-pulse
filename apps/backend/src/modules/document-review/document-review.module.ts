import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { DocumentReviewService } from './services/document-review.service';

@Module({
  imports: [AiModule],
  providers: [DocumentReviewService],
  exports: [DocumentReviewService],
})
export class DocumentReviewModule {}
