import { Module } from '@nestjs/common';

import { PrismaModule } from '@/database';
import { WebhookEventsService } from './services/webhook-events.service';

@Module({
  imports: [PrismaModule],
  providers: [WebhookEventsService],
  exports: [WebhookEventsService],
})
export class WebhookEventsModule {}
