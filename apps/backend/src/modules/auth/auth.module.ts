import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "@/database";
import { AuthService } from "./services/auth.service";
import { AuthController } from "./controllers/auth.controller";
import { GithubStrategy } from "./strategies/github.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { JwtRefreshStrategy } from "./strategies/jwt-refresh.strategy";

@Module({
  imports: [PrismaModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, GithubStrategy, JwtStrategy, JwtRefreshStrategy],
})
export class AuthModule {}
