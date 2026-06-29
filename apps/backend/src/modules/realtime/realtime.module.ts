import { Module, Global } from "@nestjs/common";
import { WorkflowGateway } from "./gateways/workflow.gateway";
import { WorkflowEventService } from "./services/workflow-event.service";

@Global()
@Module({
  providers: [WorkflowGateway, WorkflowEventService],
  exports: [WorkflowGateway, WorkflowEventService],
})
export class RealtimeModule {}
