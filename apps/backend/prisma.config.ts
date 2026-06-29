// =============================================================================
// prisma.config.ts — Prisma v7 configuration
// =============================================================================
//
// In Prisma v7, the datasource `url` property was removed from schema.prisma.
// Connection configuration now lives here and is consumed by both Prisma
// Migrate and Prisma Client.
//
// See: https://pris.ly/d/config-datasource
// =============================================================================

import path from "node:path";
import { defineConfig, env } from "prisma/config";
import dotenv from "dotenv";

// Load .env from project root
dotenv.config({ path: path.join(import.meta.dirname, "..", "..", ".env") });

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, "prisma/schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
  },
});
