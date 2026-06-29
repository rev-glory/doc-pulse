import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { User } from "@/generated/prisma/client";
import { PullRequestsService } from "../services/pull-requests.service";

@ApiTags("Pull Requests")
@ApiBearerAuth()
@Controller("pull-requests")
@UseGuards(JwtAuthGuard)
export class PullRequestsController {
  constructor(private readonly pullRequestsService: PullRequestsService) {}

  @Get()
  @ApiOperation({ summary: "List pull requests for the current user" })
  async listPullRequests(@CurrentUser() user: User) {
    return this.pullRequestsService.listPullRequests(user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get pull request details by ID" })
  async getPullRequestById(@Param("id") id: string, @CurrentUser() user: User) {
    return this.pullRequestsService.getPullRequestById(id, user);
  }
}
