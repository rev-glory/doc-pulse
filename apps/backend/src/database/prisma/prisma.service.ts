import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import pg from "pg";

// ---------------------------------------------------------------------------
// PrismaService
//
// Extends PrismaClient so every Prisma model accessor (prismaService.user,
// prismaService.workflowRun, etc.) is available directly on the injected
// service instance without an extra indirection layer.
//
// Prisma v7 requires the adapter pattern for database connections — the
// DATABASE_URL is no longer set in schema.prisma but in prisma.config.ts.
// At runtime (NestJS DI), we construct the adapter here directly from the
// validated DATABASE_URL environment variable.
//
// Lifecycle:
//   onModuleInit   → connect() is called explicitly so connection errors surface
//                    at startup rather than on the first query.
//   onModuleDestroy → $disconnect() + pool.end() for clean shutdown (Docker stop,
//                    SIGTERM from orchestrators). Without this, the process hangs
//                    waiting for the connection pool to drain.
// ---------------------------------------------------------------------------

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: pg.Pool;

  constructor() {
    const connectionString = process.env["DATABASE_URL"];

    if (!connectionString) {
      throw new Error(
        "DATABASE_URL environment variable is not set. " +
          "Copy .env.example to .env and fill in the required values.",
      );
    }

    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({ adapter });

    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    this.logger.log("Connecting to database…");
    await this.$connect();
    this.logger.log("Database connection established.");
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log("Disconnecting from database…");
    await this.$disconnect();
    await this.pool.end();
    this.logger.log("Database connection closed.");
  }
}
