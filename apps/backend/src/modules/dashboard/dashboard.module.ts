import { Module } from '@nestjs/common';
import { PrismaModule } from '@/database';
import { RunsModule } from '@/modules/runs/runs.module';
import { PullRequestsModule } from '@/modules/pull-requests/pull-requests.module';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';

@Module({
  imports: [PrismaModule, RunsModule, PullRequestsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
