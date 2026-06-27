export interface UserProfile {
  id: string;
  githubId: number;
  githubLogin: string;
  displayName: string | null;
  email: string | null;
  githubAvatarUrl: string | null;
  createdAt: string;
}

export interface UserSettings {
  theme: 'system' | 'light' | 'dark';
  notifications: {
    email: boolean;
  };
  ai: {
    provider: string;
  };
}
