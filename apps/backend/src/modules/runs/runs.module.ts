import { Module } from "@nestjs/common";
import { PrismaModule } from "@/database";
import { RunsController } from "./controllers/runs.controller";
import { RunsService } from "./services/runs.service";

@Module({
  imports: [PrismaModule],
  controllers: [RunsController],
  providers: [RunsService],
  exports: [RunsService],
})
export class RunsModule {}
