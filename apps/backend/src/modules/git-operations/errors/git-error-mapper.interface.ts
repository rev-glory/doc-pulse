import { GitException } from "./git-exception";

export interface MapGitErrorOptions {
  operation: string;
  error: unknown;
  repository?: string;
  branch?: string;
}

export interface GitErrorMapper {
  mapError(options: MapGitErrorOptions): GitException;
}
