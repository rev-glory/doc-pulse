import { GitErrorCode } from './git-error-code';
import { GitErrorClassifier } from './git-error-classifier';
import { GitErrorSanitizer } from './git-error-sanitizer';

export interface GitProviderMetadata {
  provider: string;
  repository?: string;
  branch?: string;
}

export class GitException extends Error {
  public override readonly name = 'GitException';

  constructor(
    public readonly code: GitErrorCode,
    message: string,
    public readonly provider: GitProviderMetadata,
    public readonly operation: string,
    public readonly providerStatus?: number,
    public readonly originalCause?: unknown,
  ) {
    super(GitErrorSanitizer.sanitize(message));
    Object.setPrototypeOf(this, GitException.prototype);
  }

  public get retryable(): boolean {
    return GitErrorClassifier.isRetryable(this.code);
  }
}

export function isGitException(error: unknown): error is GitException {
  return error instanceof GitException;
}
