export interface User {
  id: string;
  githubId: string;
  githubLogin: string;
  displayName: string | null;
  githubAvatarUrl: string | null;
  email: string | null;
  settings: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}
