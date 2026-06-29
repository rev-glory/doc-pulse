import { GitErrorCode } from "./git-error-code";

export class GitErrorClassifier {
  public static isRetryable(code: GitErrorCode): boolean {
    return [
      GitErrorCode.NETWORK_ERROR,
      GitErrorCode.RATE_LIMITED,
      GitErrorCode.TIMEOUT,
      GitErrorCode.REPOSITORY_LOCKED,
    ].includes(code);
  }

  public static isPermanent(code: GitErrorCode): boolean {
    return !this.isRetryable(code);
  }
}
