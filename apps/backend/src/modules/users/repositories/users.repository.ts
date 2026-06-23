import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database';
import type { User } from '@/generated/prisma/client';
import type { IUsersRepository } from '../interfaces/users.interfaces';

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByGithubId(githubId: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { githubId },
    });
  }

  async updateProfile(userId: string, data: { displayName?: string | null }): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async updateSettings(userId: string, settings: any): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { settings },
    });
  }
}
