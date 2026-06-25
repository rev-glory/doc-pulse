import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { WORKFLOW_EXECUTION_QUEUE } from './constants/queue.constants';
import { WorkflowQueueService } from './services/workflow-queue.service';
import { WorkflowProcessor } from './processors/workflow.processor';
import { WorkflowModule } from '../workflow/workflow.module';
import type { RedisConfig } from '../../config/redis.config';

@Module({
  imports: [
    WorkflowModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = configService.get<RedisConfig>('redis');

        if (!redis?.url) {
          throw new Error('Redis configuration is missing');
        }

        try {
          const parsedUrl = new URL(redis.url);
          const portNumber = Number(parsedUrl.port);

          if (!parsedUrl.hostname || !portNumber || Number.isNaN(portNumber)) {
            throw new Error('Redis URL must contain a valid hostname and port');
          }

          return {
            connection: {
              host: parsedUrl.hostname,
              port: portNumber,
              password: redis.password || parsedUrl.password || undefined,
            },
          };
        } catch (error) {
          throw new Error(
            `Invalid Redis configuration URL: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    }),
    BullModule.registerQueue({
      name: WORKFLOW_EXECUTION_QUEUE,
    }),
  ],
  providers: [WorkflowQueueService, WorkflowProcessor],
  exports: [WorkflowQueueService, BullModule],
})
export class QueueModule {}
