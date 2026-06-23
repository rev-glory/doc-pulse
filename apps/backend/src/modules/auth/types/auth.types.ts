// ---------------------------------------------------------------------------
// Auth Module Types
// ---------------------------------------------------------------------------

export interface AuthJwtPayload {
  sub: string;
  githubId: number;
}

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
