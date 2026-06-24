import { z } from 'zod';

// ---------------------------------------------------------------------------
// Reusable preprocessor — converts empty strings from dotenv ('') to undefined
// so that z.string().optional() fields honour their type contract.
// Without this, FIELD= in .env produces '' not undefined, breaking consumers
// that check `value !== undefined`.
// ---------------------------------------------------------------------------
const optionalString = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().optional(),
);

// ---------------------------------------------------------------------------
// Environment variable schema — validated at application bootstrap.
//
// Rules:
//   • Every variable the application reads MUST be declared here.
//   • Optional variables must have an explicit .default() or .optional().
//   • Never use z.any() — keep every type strict.
//   • Validation runs before the NestJS DI container starts (fail-fast).
// ---------------------------------------------------------------------------

const envSchema = z.object({
  // ── Node Runtime ──────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // ── Application ───────────────────────────────────────────────────────────
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  FRONTEND_URL: z.url().default('http://localhost:3000'),
  BACKEND_URL: z.url().default('http://localhost:3001'),

  // ── Database (PostgreSQL / Prisma) ────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .startsWith('postgresql://', 'DATABASE_URL must be a PostgreSQL connection string'),

  // ── Redis ─────────────────────────────────────────────────────────────────
  REDIS_URL: z
    .string()
    .min(1, 'REDIS_URL is required')
    .startsWith('redis://', 'REDIS_URL must start with redis://'),
  REDIS_PASSWORD: z.string().min(1, 'REDIS_PASSWORD is required'),

  // ── JWT ───────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters for security'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters for security'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // ── GitHub App ────────────────────────────────────────────────────────────
  GITHUB_APP_ID: z.string().min(1, 'GITHUB_APP_ID is required'),
  GITHUB_PRIVATE_KEY_BASE64: z
    .string()
    .min(1, 'GITHUB_PRIVATE_KEY_BASE64 is required'),
  GITHUB_WEBHOOK_SECRET: z
    .string()
    .min(1, 'GITHUB_WEBHOOK_SECRET is required'),

  // ── GitHub OAuth ──────────────────────────────────────────────────────────
  GITHUB_CLIENT_ID: z.string().min(1, 'GITHUB_CLIENT_ID is required'),
  GITHUB_CLIENT_SECRET: z
    .string()
    .min(1, 'GITHUB_CLIENT_SECRET is required'),

  // ── OpenAI ────────────────────────────────────────────────────────────────
  OPENAI_API_KEY: z
    .string()
    .min(1, 'OPENAI_API_KEY is required')
    .startsWith('sk-', 'OPENAI_API_KEY must start with sk-'),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  OPENAI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),

  // ── Anthropic (optional — fallback AI provider) ───────────────────────────
  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-20241022'),

  // ── Queue (BullMQ) ────────────────────────────────────────────────────────
  QUEUE_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
  QUEUE_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
  QUEUE_RETRY_DELAY_MS: z.coerce.number().int().min(0).default(5000),

  // ── Email / Notifications (optional in dev) ───────────────────────────────
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  // Plain string — intentionally no email() validator because SMTP_FROM supports
  // the RFC 5322 display-name format (e.g. 'DocPulse <noreply@example.com>').
  // The SMTP transport library validates the address when sending.
  SMTP_FROM: optionalString,

  // ── Storage ───────────────────────────────────────────────────────────────
  STORAGE_ROOT: z.string().default('./storage'),
  CLONES_DIR: z.string().default('clones'),
  WORKSPACE_DIR: z.string().default('workspace'),
  ARTIFACTS_DIR: z.string().default('artifacts'),

  // ── Logging ───────────────────────────────────────────────────────────────
  LOG_LEVEL: z
    .enum(['error', 'warn', 'log', 'debug', 'verbose'])
    .default('log'),
});

// ---------------------------------------------------------------------------
// Inferred type — used throughout the app to type ConfigService responses.
// ---------------------------------------------------------------------------
export type Env = z.infer<typeof envSchema>;

// ---------------------------------------------------------------------------
// Validate function — passed to ConfigModule.forRoot({ validate }).
// Throws with a descriptive error message on any validation failure so
// the developer sees exactly which variable is missing/wrong at startup.
// ---------------------------------------------------------------------------
export function validateEnv(rawEnv: Record<string, unknown>): Env {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `\n\n❌ Environment variable validation failed:\n${formatted}\n\n` +
        `Copy .env.example to .env and fill in the required values.\n`,
    );
  }

  return result.data;
}
