import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { WORKFLOW_EXECUTION_QUEUE, WORKFLOW_DLQ_QUEUE } from './constants/queue.constants';
import { WorkflowQueueService } from './services/workflow-queue.service';
import { WorkflowProcessor } from './processors/workflow.processor';
import { QueueMetricsService } from './services/queue-metrics.service';
import { QueueProgressPublisherService } from './services/queue-progress-publisher.service';
import { DeadLetterService } from './dead-letter/dead-letter.service';
import { DeadLetterProcessor } from './dead-letter/dead-letter.processor';
import { WorkflowModule } from '../workflow/workflow.module';
import type { RedisConfig } from '../../config/redis.config';
import type { QueueConfig } from '../../config/queue.config';

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
    BullModule.registerQueueAsync({
      name: WORKFLOW_EXECUTION_QUEUE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const queueCfg = configService.get<QueueConfig>('queue');
        return {
          defaultJobOptions: queueCfg
            ? {
                attempts: queueCfg.maxRetries,
                backoff: queueCfg.backoff,
                removeOnComplete: queueCfg.removeOnComplete,
                removeOnFail: queueCfg.removeOnFail,
              }
            : undefined,
        };
      },
    }),
    BullModule.registerQueue({
      name: WORKFLOW_DLQ_QUEUE,
    }),
  ],
  providers: [
    WorkflowQueueService,
    WorkflowProcessor,
    QueueMetricsService,
    QueueProgressPublisherService,
    DeadLetterService,
    DeadLetterProcessor,
  ],
  exports: [
    WorkflowQueueService,
    QueueMetricsService,
    QueueProgressPublisherService,
    DeadLetterService,
    BullModule,
  ],
})
export class QueueModule {}
