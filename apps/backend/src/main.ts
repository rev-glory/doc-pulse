import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import type { AppConfig } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const appCfg = configService.get<AppConfig>('app');
  const port = appCfg?.port ?? 3001;

  await app.listen(port);

  console.log(`🚀 DocPulse API is running on: http://localhost:${port}`);
}

void bootstrap();

