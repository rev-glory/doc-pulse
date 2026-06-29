import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { User } from "@/generated/prisma/client";
import { DashboardService } from "../services/dashboard.service";

@ApiTags("Dashboard")
@ApiBearerAuth()
@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  @ApiOperation({
    summary: "Get aggregated dashboard metrics for current user",
  })
  async getStats(@CurrentUser() user: User) {
    return this.dashboardService.getDashboardStats(user);
  }

  @Get("settings")
  @ApiOperation({ summary: "Get current system and workspace configurations" })
  async getSettings() {
    return this.dashboardService.getSettings();
  }
}
