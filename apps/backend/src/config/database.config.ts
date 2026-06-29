import { registerAs } from "@nestjs/config";

import type { Env } from "./env.validation";

// ---------------------------------------------------------------------------
// Database Configuration (PostgreSQL / Prisma)
//
// Registered under the 'database' namespace.
// Inject with: ConfigService.get<DatabaseConfig>('database')
//
// Note: The full DATABASE_URL is what Prisma consumes. The individual parts
// (host, port, etc.) are parsed here for non-Prisma usage (e.g., health checks).
// ---------------------------------------------------------------------------

export interface DatabaseConfig {
  url: string;
}

export const databaseConfig = registerAs("database", (): DatabaseConfig => {
  const env = process.env as unknown as Env;

  return {
    url: env.DATABASE_URL,
  };
});
