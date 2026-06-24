import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { User } from '@/generated/prisma/client';

import { GitHubInstallationService } from '../services/github-installation.service';
import { InstallationResponseDto } from '../dto/installation-response.dto';

@ApiTags('GitHub')
@ApiBearerAuth()
@Controller('github')
@UseGuards(JwtAuthGuard)
export class GitHubController {
  constructor(private readonly gitHubInstallationService: GitHubInstallationService) {}

  @Get('installations')
  @ApiOperation({ summary: 'List all installations for the authenticated user' })
  @ApiOkResponse({ type: [InstallationResponseDto] })
  async getInstallations(@CurrentUser() user: User): Promise<InstallationResponseDto[]> {
    return this.gitHubInstallationService.getInstallationsForUser(user.id);
  }
}
