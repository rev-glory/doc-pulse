import type { User } from '@/generated/prisma/client';

export interface IUsersRepository {
  findById(id: string): Promise<User | null>;
  findByGithubId(githubId: number): Promise<User | null>;
  updateProfile(userId: string, data: { displayName?: string | null }): Promise<User>;
  updateSettings(userId: string, settings: any): Promise<User>;
}
