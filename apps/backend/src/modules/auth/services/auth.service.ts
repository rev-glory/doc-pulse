import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '@/database';
import type { JwtConfig } from '@/config';
import type { GithubProfile, AuthJwtPayload, Tokens } from '../types/auth.types';
import type { User } from '@/generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async upsertUser(githubProfile: GithubProfile): Promise<User> {
    const { githubId, githubLogin, displayName, githubAvatarUrl, email } = githubProfile;

    return this.prisma.user.upsert({
      where: { githubId },
      create: {
        githubId,
        githubLogin,
        displayName: displayName ?? null,
        githubAvatarUrl: githubAvatarUrl ?? null,
        email: email ?? null,
      },
      update: {
        githubLogin,
        displayName: displayName ?? null,
        githubAvatarUrl: githubAvatarUrl ?? null,
        email: email ?? null,
      },
    });
  }

  async generateTokens(user: User): Promise<Tokens> {
    const jwtCfg = this.configService.get<JwtConfig>('jwt');

    if (!jwtCfg) {
      throw new Error('JWT config not found');
    }

    const payload: AuthJwtPayload = { sub: user.id, githubId: user.githubId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtCfg.secret,
        expiresIn: jwtCfg.accessExpiresIn as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: jwtCfg.secret,
        expiresIn: jwtCfg.refreshExpiresIn as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
