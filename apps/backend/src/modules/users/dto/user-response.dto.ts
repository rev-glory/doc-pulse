export class UserResponseDto {
  id!: string;
  githubId!: number;
  githubLogin!: string;
  displayName!: string | null;
  email!: string | null;
  githubAvatarUrl!: string | null;
  createdAt!: Date;
}
