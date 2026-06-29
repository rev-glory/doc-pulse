import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";

import { AppModule } from "./app.module";
import type { AppConfig } from "./config";

async function bootstrap() {
  // rawBody: true buffers the raw request bytes on req.rawBody.
  // Required by GitHubWebhooksController to verify HMAC-SHA256 signatures.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Enable NestJS lifecycle hooks (OnApplicationShutdown, OnModuleDestroy)
  // Ensures BullMQ workers safely stop fetching jobs and wait for active jobs to finish.
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.use(cookieParser());

  // Enable CORS
  const configService = app.get(ConfigService);
  const appCfg = configService.get<AppConfig>("app");
  const frontendUrl = appCfg?.frontendUrl ?? "http://localhost:3000";
  console.log("[CORS] Allowing origin:", frontendUrl);
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle("DocPulse API")
    .setDescription("API documentation for DocPulse")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  const port = appCfg?.port ?? 3001;

  await app.listen(port);

  console.log(`🚀 DocPulse API is running on: http://localhost:${port}`);
}

void bootstrap();
