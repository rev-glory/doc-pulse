export interface Scripts {
  [key: string]: string;
}

export interface Dependencies {
  production: Record<string, string>;
  development: Record<string, string>;
  peer: Record<string, string>;
}

export interface RepositoryMetrics {
  packageCount: number;
  documentationCount: number;
  configurationFileCount: number;
  workspaceCount: number;
}

export interface RepositoryMetadata {
  /** Root absolute path of the repository */
  rootPath: string;
  /** Repository name, typically derived from root package.json or folder name */
  name: string;
  /** True if the repository is a monorepo */
  isMonorepo: boolean;
  /** Package manager used (npm, yarn, pnpm, bun, etc.) */
  packageManager: string | null;
  /** Detected programming languages */
  languages: string[];
  /** Detected application/backend frameworks */
  frameworks: string[];
  /** Detected build tools */
  buildTools: string[];
  /** Detected test frameworks */
  testFrameworks: string[];
  /** Parsed dependencies from package.json */
  dependencies: Dependencies;
  /** Parsed scripts from package.json */
  scripts: Scripts;
  /** Detected monorepo management tools (turbo, nx, lerna, etc.) */
  monorepoTools: string[];
  /** Detected Docker configuration files */
  dockerFiles: string[];
  /** Detected CI/CD configuration files/folders */
  ciCdFiles: string[];
  /** Detected documentation files/folders */
  documentation: string[];
  /** Detected environment files */
  environmentFiles: string[];
  /** Detected API specification files */
  apiSpecifications: string[];
  /** Detected workspace folders (apps, packages, etc.) */
  workspaceFolders: string[];
  /** Deterministic repository metrics */
  metrics: RepositoryMetrics;
}
