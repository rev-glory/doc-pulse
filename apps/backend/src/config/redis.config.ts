import { registerAs } from "@nestjs/config";

import type { Env } from "./env.validation";

// ---------------------------------------------------------------------------
// Redis Configuration
//
// Registered under the 'redis' namespace.
// Inject with: ConfigService.get<RedisConfig>('redis')
//
// Consumed by:
//   • BullMQ queue connections
//   • LangGraph checkpoint store
// ---------------------------------------------------------------------------

export interface RedisConfig {
  url: string;
  password: string;
}

export const redisConfig = registerAs("redis", (): RedisConfig => {
  const env = process.env as unknown as Env;

  return {
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD,
  };
});
