import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

import type { GitHubConfig } from '@/config';

interface CachedToken {
  token: string;
  expiresAt: number;
}

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
      const appOctokit = new Octokit({ auth: await this.getAppJwt() });

      const { data } = await appOctokit.apps.createInstallationAccessToken({
        installation_id: installationId,
      });

      const expiresAt = new Date(data.expires_at).getTime() - 60 * 1000; // 1 minute buffer

      this.installationTokens.set(installationId, {
        token: data.token,
        expiresAt,
      });

      return data.token;
    } catch (error) {
      this.logger.error(`Failed to get installation token for ${installationId}`, error);
      throw new UnauthorizedException('Failed to authenticate with GitHub');
    }
  }

  clearInstallationToken(installationId: number): void {
    this.installationTokens.delete(installationId);
  }
}
