import { Dependency } from './dependency';
import { Technology } from './technology';
import { RepositoryMetrics } from './repository-metrics';

export interface RepositorySummary {
  name: string;
  rootPath: string;
  packageManager: string | null;
  isMonorepo: boolean;
  workspaceType: string | null;
  languages: string[];
  frameworks: string[];
  buildTools: string[];
  testFrameworks: string[];
  dependencies: Dependency[];
  scripts: Record<string, string>;
  dockerSupport: string[];
  ciCdSupport: string[];
  environmentFiles: string[];
  documentation: string[];
  workspaceFolders: string[];
  apiSpecifications: string[];
  metrics: RepositoryMetrics;
}
