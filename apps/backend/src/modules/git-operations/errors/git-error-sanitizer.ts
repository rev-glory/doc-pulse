export class GitErrorSanitizer {
  /**
   * Securely masks tokens, OAuth keys, embedded credentials, and sensitive headers.
   */
  public static sanitize(message: string): string {
    if (!message) return '';

    // 1. Mask URL embedded credentials: e.g. https://x-access-token:token@github.com/... -> https://***TOKEN***@github.com/...
    let sanitized = message.replace(/(https?:\/\/)([^:@]+):([^@]+)(@)/gi, '$1***TOKEN***$4');
    sanitized = sanitized.replace(/(https?:\/\/)([^@]+)(@)/gi, '$1***TOKEN***$3');

    // 2. Mask authorization headers or access tokens matching typical formats
    sanitized = sanitized.replace(/ghp_[a-zA-Z0-9]{36}/g, 'ghp_***TOKEN***');
    sanitized = sanitized.replace(/github_pat_[a-zA-Z0-9_]{82}/g, 'github_pat_***TOKEN***');
    sanitized = sanitized.replace(/(bearer|token|auth|password|key)\s*[:=]\s*[a-zA-Z0-9._-]{20,}/gi, '$1: ***TOKEN***');

    return sanitized;
  }
}
