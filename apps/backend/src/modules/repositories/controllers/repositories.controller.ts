import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  UseGuards,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { User } from '@/generated/prisma/client';

import { RepositoriesService } from '../services/repositories.service';
import { ConnectRepositoryDto } from '../dto/connect-repository.dto';
import { UpdateRepositoryDto } from '../dto/update-repository.dto';
import { RepositoryResponseDto } from '../dto/repository-response.dto';

@ApiTags('Repositories')
@ApiBearerAuth()
@Controller('repositories')
@UseGuards(JwtAuthGuard)
export class RepositoriesController {
  constructor(private repositoriesService: RepositoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all connected repositories' })
  @ApiOkResponse({ type: [RepositoryResponseDto] })
  async listRepositories(@CurrentUser() user: User): Promise<RepositoryResponseDto[]> {
    return this.repositoriesService.listRepositories(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a repository by ID' })
  @ApiOkResponse({ type: RepositoryResponseDto })
  async getRepositoryById(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<RepositoryResponseDto> {
    return this.repositoriesService.getRepositoryById(id, user);
  }

  @Post('connect')
  @ApiOperation({ summary: 'Connect a new GitHub repository' })
  @ApiOkResponse({ type: RepositoryResponseDto })
  async connectRepository(
    @Body() connectRepositoryDto: ConnectRepositoryDto,
    @CurrentUser() user: User,
  ): Promise<RepositoryResponseDto> {
    return this.repositoriesService.connectRepository(connectRepositoryDto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a repository' })
  @ApiOkResponse({ type: RepositoryResponseDto })
  async updateRepository(
    @Param('id') id: string,
    @Body() updateRepositoryDto: UpdateRepositoryDto,
    @CurrentUser() user: User,
  ): Promise<RepositoryResponseDto> {
    return this.repositoriesService.updateRepository(id, updateRepositoryDto, user);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a repository' })
  @ApiOkResponse({ type: RepositoryResponseDto })
  async activateRepository(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<RepositoryResponseDto> {
    return this.repositoriesService.activateRepository(id, user);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a repository' })
  @ApiOkResponse({ type: RepositoryResponseDto })
  async deactivateRepository(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<RepositoryResponseDto> {
    return this.repositoriesService.deactivateRepository(id, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a repository' })
  @ApiOkResponse({ description: 'Repository deleted successfully' })
  async deleteRepository(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.repositoriesService.deleteRepository(id, user);
  }
}
