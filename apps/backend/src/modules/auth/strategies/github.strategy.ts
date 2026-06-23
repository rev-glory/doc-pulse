import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';

import type { GitHubConfig } from '@/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private configService: ConfigService) {
    const githubCfg = configService.get<GitHubConfig>('github');

    if (!githubCfg) {
      throw new Error('GitHub config not found');
    }

    super({
      clientID: githubCfg.clientId,
      clientSecret: githubCfg.clientSecret,
      callbackURL: `${configService.get('BACKEND_URL')}/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user?: any, info?: any) => void,
  ): Promise<void> {
    const { id, username, displayName, photos, emails } = profile;

    const user = {
      githubId: Number(id),
      githubLogin: username,
      displayName: displayName,
      githubAvatarUrl: photos?.[0]?.value,
      email: emails?.[0]?.value,
    };

    done(null, user);
  }
}
