export interface GitRepository {
  id: string;
  cloneUrl: string;
  defaultBranch: string;
}

export interface RepositoryWorkspace {
  repositoryPath: string;
  workspacePath: string;
  artifactsPath: string;
}
