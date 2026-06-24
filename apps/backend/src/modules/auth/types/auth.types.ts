// ---------------------------------------------------------------------------
// Auth Module Types
// ---------------------------------------------------------------------------

export interface AuthJwtPayload {
  sub: string;
  githubId: number;
}

/**
 * Identity data extracted from the GitHub OAuth profile during login.
 *
 * OAuth access tokens are intentionally excluded. GitHub OAuth is used
 * only to authenticate the user into DocPulse — the token itself has no
 * downstream role and must not be persisted or forwarded.
 */
export interface GithubProfile {
  githubId: number;
  githubLogin: string;
  displayName?: string;
  githubAvatarUrl?: string;
  email?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
