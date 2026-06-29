import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-github2";

import type { GitHubConfig } from "@/config";
import type { GithubProfile } from "../types/auth.types";

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, "github") {
  constructor(private configService: ConfigService) {
    const githubCfg = configService.get<GitHubConfig>("github");

    if (!githubCfg) {
      throw new Error("GitHub config not found");
    }

    super({
      clientID: githubCfg.clientId,
      clientSecret: githubCfg.clientSecret,
      callbackURL: `${configService.get("BACKEND_URL")}/auth/github/callback`,
      // Minimum scope required to identify the user.
      // Repository access uses Installation Access Tokens — never OAuth tokens.
      scope: ["user:email", "read:user"],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: (err: any, user?: GithubProfile, info?: any) => void,
  ): Promise<void> {
    const { id, username, displayName, photos, emails } = profile;

    // Extract identity fields only. The OAuth token is intentionally discarded
    // here — it has no role in the GitHub App architecture.
    const user: GithubProfile = {
      githubId: Number(id),
      githubLogin: username,
      displayName: displayName,
      githubAvatarUrl: photos?.[0]?.value,
      email: emails?.[0]?.value,
    };

    done(null, user);
  }
}
