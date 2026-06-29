import { registerAs } from "@nestjs/config";

import type { Env } from "./env.validation";

// ---------------------------------------------------------------------------
// Notification Configuration (SMTP / Email)
//
// Registered under the 'notification' namespace.
// Inject with: ConfigService.get<NotificationConfig>('notification')
//
// Consumed by:
//   • NotificationsModule (email transport setup)
//
// Design note:
//   SMTP settings are optional — the NotificationsModule should check
//   `isEnabled` before attempting to send. This prevents startup failures
//   in local dev where email is not configured.
// ---------------------------------------------------------------------------

export interface NotificationConfig {
  isEnabled: boolean;
  smtp: {
    host: string | undefined;
    port: number;
    user: string | undefined;
    pass: string | undefined;
    from: string | undefined;
  };
}

export const notificationConfig = registerAs(
  "notification",
  (): NotificationConfig => {
    const env = process.env as unknown as Env;

    const isEnabled = Boolean(
      env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM,
    );

    return {
      isEnabled,
      smtp: {
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT),
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
        from: env.SMTP_FROM,
      },
    };
  },
);
