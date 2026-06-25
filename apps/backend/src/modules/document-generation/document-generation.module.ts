import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { DocumentGenerationService } from './services/document-generation.service';

@Module({
  imports: [AiModule],
  providers: [DocumentGenerationService],
  exports: [DocumentGenerationService],
})
export class DocumentGenerationModule {}
