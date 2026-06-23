import { registerAs } from '@nestjs/config';

import type { Env } from './env.validation';

// ---------------------------------------------------------------------------
// JWT Configuration
//
// Registered under the 'jwt' namespace.
// Inject with: ConfigService.get<JwtConfig>('jwt')
//
// Consumed by:
//   • AuthModule (sign/verify access and refresh tokens)
// ---------------------------------------------------------------------------

export interface JwtConfig {
  secret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export const jwtConfig = registerAs('jwt', (): JwtConfig => {
  const env = process.env as unknown as Env;

  return {
    secret: env.JWT_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  };
});
