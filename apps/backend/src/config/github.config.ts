import { registerAs } from "@nestjs/config";

import type { Env } from "./env.validation";

// ---------------------------------------------------------------------------
// GitHub Configuration
//
// Registered under the 'github' namespace.
// Inject with: ConfigService.get<GitHubConfig>('github')
//
// Consumed by:
//   • GitHub App authentication (Octokit App client)
//   • GitHub OAuth (user login flow)
//   • Webhook signature verification middleware
//
// Security note:
//   GITHUB_PRIVATE_KEY_BASE64 is stored base64-encoded to safely embed
//   a PEM certificate in an environment variable (PEM contains newlines).
//   Decode it here — never store the raw PEM in env.
// ---------------------------------------------------------------------------

export interface GitHubConfig {
  appId: string;
  /** Decoded PEM private key — ready for use with Octokit App. */
  privateKey: string;
  webhookSecret: string;
  clientId: string;
  clientSecret: string;
}

export const githubConfig = registerAs("github", (): GitHubConfig => {
  const env = process.env as unknown as Env;

  // Decode the base64-encoded PEM key to its raw string form.
  const privateKey = Buffer.from(
    env.GITHUB_PRIVATE_KEY_BASE64,
    "base64",
  ).toString("utf-8");

  return {
    appId: env.GITHUB_APP_ID,
    privateKey,
    webhookSecret: env.GITHUB_WEBHOOK_SECRET,
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  };
});
