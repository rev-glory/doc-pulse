import { GitStatus } from "../types/git-types";

export const GIT_PROVIDER = Symbol("GIT_PROVIDER");

export interface IGitProvider {
  clone(repositoryUrl: string, destinationPath: string): Promise<void>;
  fetch(repositoryPath: string): Promise<void>;
  pull(repositoryPath: string): Promise<void>;
  checkout(repositoryPath: string, ref: string): Promise<void>;
  currentBranch(repositoryPath: string): Promise<string>;
  currentCommit(repositoryPath: string): Promise<string>;
  resetHard(repositoryPath: string, ref?: string): Promise<void>;
  clean(repositoryPath: string): Promise<void>;
  status(repositoryPath: string): Promise<GitStatus>;
  branchList(repositoryPath: string): Promise<string[]>;
  checkoutLocalBranch(
    repositoryPath: string,
    branchName: string,
  ): Promise<void>;
  deleteLocalBranch(
    repositoryPath: string,
    branchName: string,
    force?: boolean,
  ): Promise<void>;
  add(repositoryPath: string, files: string | string[]): Promise<void>;
  commit(repositoryPath: string, message: string): Promise<string>;
  push(
    repositoryPath: string,
    remote: string,
    branch: string,
    options?: string[],
  ): Promise<void>;
  diff(repositoryPath: string, options?: string[]): Promise<string>;
  getRepositoryRoot(repositoryPath: string): Promise<string>;
  getRemoteUrl(repositoryPath: string, remoteName: string): Promise<string>;
  setRemoteUrl(
    repositoryPath: string,
    remoteName: string,
    url: string,
  ): Promise<void>;
  getModifiedFiles(
    repositoryPath: string,
    commitSha: string,
  ): Promise<string[]>;
  getCommitMessage(repositoryPath: string, commitSha: string): Promise<string>;
}
