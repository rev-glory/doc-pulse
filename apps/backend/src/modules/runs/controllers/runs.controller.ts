import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { User } from '@/generated/prisma/client';
import { RunsService } from '../services/runs.service';

@ApiTags('Workflow Runs')
@ApiBearerAuth()
@Controller('runs')
@UseGuards(JwtAuthGuard)
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Get()
  @ApiOperation({ summary: 'List workflow runs for the current user' })
  async listRuns(@CurrentUser() user: User) {
    return this.runsService.listRuns(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow run details by ID' })
  async getRunById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.runsService.getRunById(id, user);
  }
}
