import { Module } from '@nestjs/common';
import { RepositoryAnalysisService } from './services/repository-analysis.service';

@Module({
  providers: [RepositoryAnalysisService],
  exports: [RepositoryAnalysisService],
})
export class RepositoryAnalysisModule {}
