import { Controller, Get, Patch, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiOkResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UsersService } from '../services/users.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateSettingsDto } from '../dto/update-settings.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { SettingsResponseDto } from '../dto/settings-response.dto';
import type { User } from '@/generated/prisma/client';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  async getCurrentUser(@CurrentUser() user: User): Promise<UserResponseDto> {
    return this.usersService.getCurrentUser(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get current user settings' })
  @ApiOkResponse({ type: SettingsResponseDto })
  async getSettings(@CurrentUser() user: User): Promise<SettingsResponseDto> {
    return this.usersService.getUserSettings(user.id);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update current user settings' })
  @ApiOkResponse({ type: SettingsResponseDto })
  async updateSettings(
    @CurrentUser() user: User,
    @Body() dto: UpdateSettingsDto,
  ): Promise<SettingsResponseDto> {
    return this.usersService.updateUserSettings(user.id, dto);
  }
}
