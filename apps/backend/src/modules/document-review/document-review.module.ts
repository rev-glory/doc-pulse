import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { DocumentGenerationModule } from "../document-generation/document-generation.module";
import { DocumentReviewService } from "./services/document-review.service";
import { ReviewEvaluatorService } from "./services/review-evaluator.service";

@Module({
  imports: [AiModule, DocumentGenerationModule],
  providers: [DocumentReviewService, ReviewEvaluatorService],
  exports: [DocumentReviewService, ReviewEvaluatorService],
})
export class DocumentReviewModule {}
