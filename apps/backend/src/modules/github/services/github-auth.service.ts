import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAppAuth } from '@octokit/auth-app';

import type { GitHubConfig } from '@/config';
import type { CachedToken } from '../interfaces/github.interfaces';

@Injectable()
export class GitHubAuthService {
  private readonly logger = new Logger(GitHubAuthService.name);
  private readonly appAuth: ReturnType<typeof createAppAuth>;
  private jwtToken: CachedToken | null = null;
  private readonly installationTokens = new Map<number, CachedToken>();

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<GitHubConfig>('github')!;
    this.appAuth = createAppAuth({
      appId: config.appId,
      privateKey: config.privateKey,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    });
  }

  async getAppJwt(): Promise<string> {
    if (this.jwtToken && Date.now() < this.jwtToken.expiresAt) {
      return this.jwtToken.token;
    }

    this.logger.debug('Generating new GitHub App JWT');

    const auth = await this.appAuth({ type: 'app' });
    const expiresAt = Date.now() + 9 * 60 * 1000; // 9 minutes (GitHub allows max 10)

    this.jwtToken = {
      token: auth.token,
      expiresAt,
    };

    return auth.token;
  }

  async getInstallationAccessToken(installationId: number): Promise<string> {
    const cached = this.installationTokens.get(installationId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.token;
    }

    this.logger.debug(`Requesting new installation access token for installation ${installationId}`);

    try {
      // Delegate token creation to @octokit/auth-app — it constructs the
      // App JWT internally and exchanges it for an installation token.
      // This avoids creating a raw Octokit instance here and keeps the
      // responsibility for retry/rate-limit handling in GitHubApiService.
      const auth = await this.appAuth({
        type: 'installation',
        installationId,
      });

      // GitHub installation tokens expire after 1 hour. We subtract 60 s
      // as a safety buffer to avoid using a token in its final second.
      const expiresAt = new Date(auth.expiresAt).getTime() - 60 * 1000;

      this.installationTokens.set(installationId, {
        token: auth.token,
        expiresAt,
      });

      return auth.token;
    } catch (error) {
      this.logger.error(`Failed to get installation token for ${installationId}`, error);
      throw new UnauthorizedException('Failed to authenticate with GitHub');
    }
  }

  clearInstallationToken(installationId: number): void {
    this.installationTokens.delete(installationId);
  }
}
