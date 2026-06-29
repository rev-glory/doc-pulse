import { Injectable, NotFoundException } from "@nestjs/common";

import { UsersRepository } from "../repositories/users.repository";
import { UsersMapper } from "../mappers/users.mapper";
import type { UserResponseDto } from "../dto/user-response.dto";
import type { UpdateProfileDto } from "../dto/update-profile.dto";
import type { SettingsResponseDto } from "../dto/settings-response.dto";
import type { UpdateSettingsDto } from "../dto/update-settings.dto";

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return UsersMapper.toUserResponseDto(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersRepository.updateProfile(userId, {
      displayName: dto.displayName,
    });

    return UsersMapper.toUserResponseDto(user);
  }

  async getUserSettings(userId: string): Promise<SettingsResponseDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return UsersMapper.toSettingsResponseDto(user.settings);
  }

  async updateUserSettings(
    userId: string,
    dto: UpdateSettingsDto,
  ): Promise<SettingsResponseDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const mergedSettings = UsersMapper.mergeSettings(user.settings, dto);
    const updatedUser = await this.usersRepository.updateSettings(
      userId,
      mergedSettings,
    );

    return UsersMapper.toSettingsResponseDto(updatedUser.settings);
  }
}
