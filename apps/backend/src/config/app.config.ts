import { registerAs } from "@nestjs/config";

import type { Env } from "./env.validation";

// ---------------------------------------------------------------------------
// App Configuration
//
// Registered under the 'app' namespace.
// Inject with: ConfigService.get<AppConfig>('app')
// ---------------------------------------------------------------------------

export interface AppConfig {
  nodeEnv: Env["NODE_ENV"];
  port: number;
  frontendUrl: string;
  backendUrl: string;
  logLevel: Env["LOG_LEVEL"];
  isProduction: boolean;
  isDevelopment: boolean;
}

export const appConfig = registerAs("app", (): AppConfig => {
  const env = process.env as unknown as Env;

  return {
    nodeEnv: env.NODE_ENV,
    port: Number(env.PORT),
    frontendUrl: env.FRONTEND_URL,
    backendUrl: env.BACKEND_URL,
    logLevel: env.LOG_LEVEL,
    isProduction: env.NODE_ENV === "production",
    isDevelopment: env.NODE_ENV === "development",
  };
});
