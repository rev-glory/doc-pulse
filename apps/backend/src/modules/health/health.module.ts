import { Module } from "@nestjs/common";

import { QueueModule } from "../queue/queue.module";
import { HealthController } from "./controllers/health.controller";
import { HealthService } from "./services/health.service";

@Module({
  imports: [QueueModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
