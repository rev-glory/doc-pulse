export interface UserSettings {
  theme: 'system' | 'light' | 'dark';
  notifications: {
    email: boolean;
  };
  ai: {
    provider: 'openai';
  };
}
