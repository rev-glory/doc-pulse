import {
  Controller,
  Get,
  Post,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';

import { AuthService } from '../services/auth.service';
import { GithubAuthGuard } from '../guards/github-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from '../guards/jwt-refresh-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { User } from '@/generated/prisma/client';
import type { JwtConfig } from '@/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('github')
  @UseGuards(GithubAuthGuard)
  async githubLogin() {
    // Passport will handle redirecting to GitHub
  }

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  async githubCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const githubProfile = req.user as any;
    const user = await this.authService.upsertUser({
      githubId: githubProfile.githubId,
      githubLogin: githubProfile.githubLogin,
      displayName: githubProfile.displayName,
      githubAvatarUrl: githubProfile.githubAvatarUrl,
      email: githubProfile.email,
    });

    const tokens = await this.authService.generateTokens(user);

    this.setAuthCookies(res, tokens);

    const frontendUrl = this.configService.get('FRONTEND_URL');
    res.redirect(`${frontendUrl}/dashboard`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: User) {
    return user;
  }

  @Post('refresh')
  @UseGuards(JwtRefreshAuthGuard)
  async refreshTokens(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.generateTokens(user);
    this.setAuthCookies(res, tokens);
    return { message: 'Tokens refreshed successfully' };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', this.getCookieOptions());
    res.clearCookie('refresh_token', this.getCookieOptions());
    return { message: 'Logged out successfully' };
  }

  private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    res.cookie('access_token', tokens.accessToken, {
      ...this.getCookieOptions(),
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      ...this.getCookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private getCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };
  }
}
