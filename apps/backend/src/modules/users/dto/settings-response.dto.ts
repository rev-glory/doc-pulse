export class SettingsResponseDto {
  theme!: "system" | "light" | "dark";
  notifications!: {
    email: boolean;
  };
  ai!: {
    provider: "openai";
  };
}
