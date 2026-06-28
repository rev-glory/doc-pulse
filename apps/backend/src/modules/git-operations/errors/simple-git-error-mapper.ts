import { GitErrorMapper, MapGitErrorOptions } from './git-error-mapper.interface';
import { GitException } from './git-exception';
import { GitErrorCode } from './git-error-code';
import { GitErrorSanitizer } from './git-error-sanitizer';

export class SimpleGitErrorMapper implements GitErrorMapper {
  public mapError(options: MapGitErrorOptions): GitException {
    const { operation, error, repository, branch } = options;
    const providerName = 'SimpleGit';

    let message = '';
    let stderr = '';

    if (error && typeof error === 'object') {
      if ('message' in error) {
        message = String((error as any).message);
      }
      if ('stderr' in error) {
        stderr = String((error as any).stderr);
      }
    } else {
      message = String(error);
    }

    const combinedLower = `${message} ${stderr}`.toLowerCase();
    let code = GitErrorCode.UNKNOWN;

    // 1. Authentication / Authorization issues
    if (
      combinedLower.includes('authentication failed') ||
      combinedLower.includes('could not read username') ||
      combinedLower.includes('could not read password') ||
      combinedLower.includes('permission denied') ||
      combinedLower.includes('terminal prompts disabled')
    ) {
      code = GitErrorCode.AUTHENTICATION_FAILED;
    }
    // 2. Repository not found or remote remote URL errors
    else if (
      combinedLower.includes('repository not found') ||
      combinedLower.includes('does not exist') ||
      combinedLower.includes('could not read from remote repository')
    ) {
      code = GitErrorCode.REPOSITORY_NOT_FOUND;
    }
    // 3. Branch already exists
    else if (combinedLower.includes('already exists')) {
      code = GitErrorCode.BRANCH_ALREADY_EXISTS;
    }
    // 4. Merge conflict
    else if (
      combinedLower.includes('merge conflict') ||
      combinedLower.includes('conflict (content)') ||
      combinedLower.includes('prevented by merge checks')
    ) {
      code = GitErrorCode.MERGE_CONFLICT;
    }
    // 5. Protected branch direct commit/push rejection
    else if (
      combinedLower.includes('protected branch') ||
      combinedLower.includes('cannot push to protected')
    ) {
      code = GitErrorCode.PROTECTED_BRANCH;
    }
    // 6. Push rejected general errors
    else if (
      combinedLower.includes('push rejected') ||
      combinedLower.includes('updates were rejected') ||
      combinedLower.includes('failed to push')
    ) {
      code = GitErrorCode.PUSH_REJECTED;
    }
    // 7. Network connectivity issues
    else if (
      combinedLower.includes('could not resolve host') ||
      combinedLower.includes('connection refused') ||
      combinedLower.includes('disconnected') ||
      combinedLower.includes('network') ||
      combinedLower.includes('econnreset')
    ) {
      code = GitErrorCode.NETWORK_ERROR;
    }
    // 8. Timeout
    else if (combinedLower.includes('timeout') || combinedLower.includes('timed out')) {
      code = GitErrorCode.TIMEOUT;
    }
    // 9. Locked repository index lock
    else if (combinedLower.includes('index.lock') || combinedLower.includes('lock file')) {
      code = GitErrorCode.REPOSITORY_LOCKED;
    }

    const cleanMsg = `Git error during [${operation}]: ${GitErrorSanitizer.sanitize(message)}`;

    return new GitException(
      code,
      cleanMsg,
      { provider: providerName, repository, branch },
      operation,
      undefined,
      error,
    );
  }
}
