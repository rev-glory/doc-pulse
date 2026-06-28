import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { GitErrorCode } from '../../src/modules/git-operations/errors/git-error-code';
import { GitErrorClassifier } from '../../src/modules/git-operations/errors/git-error-classifier';
import { GitErrorSanitizer } from '../../src/modules/git-operations/errors/git-error-sanitizer';
import { GitException, isGitException } from '../../src/modules/git-operations/errors/git-exception';
import { SimpleGitErrorMapper } from '../../src/modules/git-operations/errors/simple-git-error-mapper';
import {
  classifyWorkflowError,
  QueueErrorClassification,
} from '../../src/modules/queue/types/queue-errors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGitException(code: GitErrorCode, message = 'git error'): GitException {
  return new GitException(code, message, { provider: 'SimpleGit', repository: 'repo/test' }, 'testOp');
}

// Minimal domain exception that wraps a GitException as its cause
class CloneFailedException extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'CloneFailedException';
  }
}

class WorkflowExecutionException extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'WorkflowExecutionException';
  }
}

// ---------------------------------------------------------------------------
// GitErrorCode
// ---------------------------------------------------------------------------

describe('GitErrorCode', () => {
  it('should expose the expected error codes', () => {
    assert.equal(GitErrorCode.AUTHENTICATION_FAILED, 'AUTHENTICATION_FAILED');
    assert.equal(GitErrorCode.NETWORK_ERROR, 'NETWORK_ERROR');
    assert.equal(GitErrorCode.UNKNOWN, 'UNKNOWN');
  });
});

// ---------------------------------------------------------------------------
// GitErrorClassifier
// ---------------------------------------------------------------------------

describe('GitErrorClassifier', () => {
  it('marks NETWORK_ERROR as retryable', () => {
    assert.equal(GitErrorClassifier.isRetryable(GitErrorCode.NETWORK_ERROR), true);
  });

  it('marks RATE_LIMITED as retryable', () => {
    assert.equal(GitErrorClassifier.isRetryable(GitErrorCode.RATE_LIMITED), true);
  });

  it('marks TIMEOUT as retryable', () => {
    assert.equal(GitErrorClassifier.isRetryable(GitErrorCode.TIMEOUT), true);
  });

  it('marks REPOSITORY_LOCKED as retryable', () => {
    assert.equal(GitErrorClassifier.isRetryable(GitErrorCode.REPOSITORY_LOCKED), true);
  });

  it('marks AUTHENTICATION_FAILED as permanent', () => {
    assert.equal(GitErrorClassifier.isPermanent(GitErrorCode.AUTHENTICATION_FAILED), true);
  });

  it('marks REPOSITORY_NOT_FOUND as permanent', () => {
    assert.equal(GitErrorClassifier.isPermanent(GitErrorCode.REPOSITORY_NOT_FOUND), true);
  });

  it('marks MERGE_CONFLICT as permanent', () => {
    assert.equal(GitErrorClassifier.isPermanent(GitErrorCode.MERGE_CONFLICT), true);
  });

  it('marks PUSH_REJECTED as permanent', () => {
    assert.equal(GitErrorClassifier.isPermanent(GitErrorCode.PUSH_REJECTED), true);
  });

  it('marks UNKNOWN as permanent', () => {
    assert.equal(GitErrorClassifier.isPermanent(GitErrorCode.UNKNOWN), true);
  });
});

// ---------------------------------------------------------------------------
// GitErrorSanitizer
// ---------------------------------------------------------------------------

describe('GitErrorSanitizer', () => {
  it('masks embedded username:password credentials in URL', () => {
    const input = 'fatal: repository https://user:secret-password@github.com/org/repo.git not found';
    const out = GitErrorSanitizer.sanitize(input);
    assert.ok(!out.includes('secret-password'), 'password should be masked');
    assert.ok(out.includes('***TOKEN***'), 'should contain masked placeholder');
  });

  it('masks x-access-token style OAuth URL', () => {
    const input = 'fatal: https://x-access-token:ghp_abc123def456ghi789jkl012mno345pqr678@github.com/org/repo.git';
    const out = GitErrorSanitizer.sanitize(input);
    assert.ok(!out.includes('ghp_abc123def456ghi789jkl012mno345pqr678'), 'token should be masked');
    assert.ok(out.includes('***TOKEN***'), 'should contain masked placeholder');
  });

  it('masks ghp_ GitHub personal access tokens', () => {
    const token = 'ghp_' + 'A'.repeat(36);
    const input = `Authentication failed using token: ${token}`;
    const out = GitErrorSanitizer.sanitize(input);
    assert.ok(!out.includes(token), 'PAT should be masked');
    assert.ok(out.includes('ghp_***TOKEN***'), 'should contain masked placeholder');
  });

  it('masks bearer authorization headers', () => {
    const input = 'bearer: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';
    const out = GitErrorSanitizer.sanitize(input);
    assert.ok(!out.includes('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9'), 'token should be masked');
    assert.ok(out.includes('***TOKEN***'), 'should contain masked placeholder');
  });

  it('returns empty string for empty input', () => {
    assert.equal(GitErrorSanitizer.sanitize(''), '');
  });

  it('leaves messages without credentials unchanged', () => {
    const input = 'fatal: repository not found';
    assert.equal(GitErrorSanitizer.sanitize(input), input);
  });
});

// ---------------------------------------------------------------------------
// GitException
// ---------------------------------------------------------------------------

describe('GitException', () => {
  it('constructs with the correct code and sanitized message', () => {
    const token = 'ghp_' + 'B'.repeat(36);
    const ex = new GitException(
      GitErrorCode.AUTHENTICATION_FAILED,
      `Failed: https://x-access-token:${token}@github.com/org/repo.git`,
      { provider: 'SimpleGit' },
      'clone',
    );
    assert.equal(ex.code, GitErrorCode.AUTHENTICATION_FAILED);
    assert.ok(!ex.message.includes(token), 'raw token must not appear in message');
    assert.ok(ex.message.includes('***TOKEN***'), 'sanitized placeholder must appear');
    assert.equal(ex.name, 'GitException');
  });

  it('exposes retryable=true for NETWORK_ERROR', () => {
    const ex = makeGitException(GitErrorCode.NETWORK_ERROR);
    assert.equal(ex.retryable, true);
  });

  it('exposes retryable=false for AUTHENTICATION_FAILED', () => {
    const ex = makeGitException(GitErrorCode.AUTHENTICATION_FAILED);
    assert.equal(ex.retryable, false);
  });

  it('is correctly identified by isGitException()', () => {
    const ex = makeGitException(GitErrorCode.UNKNOWN);
    assert.equal(isGitException(ex), true);
    assert.equal(isGitException(new Error('regular')), false);
    assert.equal(isGitException(null), false);
    assert.equal(isGitException('string'), false);
  });

  it('instanceof check works after setPrototypeOf fix', () => {
    const ex = makeGitException(GitErrorCode.UNKNOWN);
    assert.ok(ex instanceof GitException);
    assert.ok(ex instanceof Error);
  });
});

// ---------------------------------------------------------------------------
// SimpleGitErrorMapper
// ---------------------------------------------------------------------------

describe('SimpleGitErrorMapper', () => {
  const mapper = new SimpleGitErrorMapper();

  function map(message: string, stderr = ''): GitException {
    return mapper.mapError({
      operation: 'clone',
      error: { message, stderr },
      repository: 'https://github.com/org/repo.git',
    });
  }

  it('maps "authentication failed" -> AUTHENTICATION_FAILED', () => {
    assert.equal(map('remote: authentication failed').code, GitErrorCode.AUTHENTICATION_FAILED);
  });

  it('maps "could not read username" -> AUTHENTICATION_FAILED', () => {
    assert.equal(map('fatal: could not read username').code, GitErrorCode.AUTHENTICATION_FAILED);
  });

  it('maps "permission denied" -> AUTHENTICATION_FAILED', () => {
    assert.equal(map('Permission denied (publickey)').code, GitErrorCode.AUTHENTICATION_FAILED);
  });

  it('maps "repository not found" -> REPOSITORY_NOT_FOUND', () => {
    assert.equal(map('ERROR: Repository not found.').code, GitErrorCode.REPOSITORY_NOT_FOUND);
  });

  it('maps "could not read from remote repository" -> REPOSITORY_NOT_FOUND', () => {
    assert.equal(map('fatal: Could not read from remote repository').code, GitErrorCode.REPOSITORY_NOT_FOUND);
  });

  it('maps "already exists" -> BRANCH_ALREADY_EXISTS', () => {
    assert.equal(map("fatal: A branch named 'main' already exists.").code, GitErrorCode.BRANCH_ALREADY_EXISTS);
  });

  it('maps "merge conflict" -> MERGE_CONFLICT', () => {
    assert.equal(map('error: merge conflict detected').code, GitErrorCode.MERGE_CONFLICT);
  });

  it('maps "updates were rejected" -> PUSH_REJECTED', () => {
    assert.equal(map('error: failed to push some refs; updates were rejected').code, GitErrorCode.PUSH_REJECTED);
  });

  it('maps "protected branch" -> PROTECTED_BRANCH', () => {
    assert.equal(map('error: GH006: Protected branch update failed').code, GitErrorCode.PROTECTED_BRANCH);
  });

  it('maps "could not resolve host" -> NETWORK_ERROR', () => {
    assert.equal(map('fatal: unable to access: Could not resolve host: github.com').code, GitErrorCode.NETWORK_ERROR);
  });

  it('maps "timeout" -> TIMEOUT', () => {
    assert.equal(map('error: git operation timed out').code, GitErrorCode.TIMEOUT);
  });

  it('maps "index.lock" -> REPOSITORY_LOCKED', () => {
    assert.equal(map('fatal: Unable to create .git/index.lock: File exists').code, GitErrorCode.REPOSITORY_LOCKED);
  });

  it('maps unrecognized error -> UNKNOWN', () => {
    assert.equal(map('some completely unknown error XYZ').code, GitErrorCode.UNKNOWN);
  });

  it('sanitizes embedded tokens from mapped exception messages', () => {
    const token = 'ghp_' + 'C'.repeat(36);
    const ex = mapper.mapError({
      operation: 'clone',
      error: { message: `fatal: https://x-access-token:${token}@github.com/org/repo.git not found` },
    });
    assert.ok(!ex.message.includes(token), 'token must be stripped from mapped message');
  });
});

// ---------------------------------------------------------------------------
// classifyWorkflowError — GitException (shallow)
// ---------------------------------------------------------------------------

describe('classifyWorkflowError — GitException direct', () => {
  it('classifies retryable GitException as TRANSIENT', () => {
    const ex = makeGitException(GitErrorCode.NETWORK_ERROR);
    assert.equal(classifyWorkflowError(ex), QueueErrorClassification.TRANSIENT);
  });

  it('classifies permanent GitException as PERMANENT', () => {
    const ex = makeGitException(GitErrorCode.AUTHENTICATION_FAILED);
    assert.equal(classifyWorkflowError(ex), QueueErrorClassification.PERMANENT);
  });

  it('classifies TIMEOUT GitException as TRANSIENT', () => {
    const ex = makeGitException(GitErrorCode.TIMEOUT);
    assert.equal(classifyWorkflowError(ex), QueueErrorClassification.TRANSIENT);
  });
});

// ---------------------------------------------------------------------------
// classifyWorkflowError — Nested cause chain (regression tests)
// ---------------------------------------------------------------------------

describe('classifyWorkflowError — nested cause chain traversal', () => {
  it('classifies CloneFailedException(cause: GitException[NETWORK]) as TRANSIENT', () => {
    const gitEx = makeGitException(GitErrorCode.NETWORK_ERROR);
    const cloneEx = new CloneFailedException('Clone failed', gitEx);
    assert.equal(classifyWorkflowError(cloneEx), QueueErrorClassification.TRANSIENT);
  });

  it('classifies CloneFailedException(cause: GitException[AUTH]) as PERMANENT', () => {
    const gitEx = makeGitException(GitErrorCode.AUTHENTICATION_FAILED);
    const cloneEx = new CloneFailedException('Clone failed', gitEx);
    assert.equal(classifyWorkflowError(cloneEx), QueueErrorClassification.PERMANENT);
  });

  it('classifies WorkflowExecutionException -> CloneFailedException -> GitException[NETWORK] as TRANSIENT', () => {
    const gitEx = makeGitException(GitErrorCode.NETWORK_ERROR);
    const cloneEx = new CloneFailedException('Clone failed', gitEx);
    const workflowEx = new WorkflowExecutionException('Workflow failed', cloneEx);
    assert.equal(classifyWorkflowError(workflowEx), QueueErrorClassification.TRANSIENT);
  });

  it('classifies WorkflowExecutionException -> CloneFailedException -> GitException[AUTH] as PERMANENT', () => {
    const gitEx = makeGitException(GitErrorCode.AUTHENTICATION_FAILED);
    const cloneEx = new CloneFailedException('Clone failed', gitEx);
    const workflowEx = new WorkflowExecutionException('Workflow failed', cloneEx);
    assert.equal(classifyWorkflowError(workflowEx), QueueErrorClassification.PERMANENT);
  });

  it('classifies WorkflowExecutionException -> CloneFailedException -> GitException[RATE_LIMITED] as TRANSIENT', () => {
    const gitEx = makeGitException(GitErrorCode.RATE_LIMITED);
    const cloneEx = new CloneFailedException('Clone failed', gitEx);
    const workflowEx = new WorkflowExecutionException('Workflow failed', cloneEx);
    assert.equal(classifyWorkflowError(workflowEx), QueueErrorClassification.TRANSIENT);
  });

  it('classifies WorkflowExecutionException -> CloneFailedException -> GitException[REPOSITORY_NOT_FOUND] as PERMANENT', () => {
    const gitEx = makeGitException(GitErrorCode.REPOSITORY_NOT_FOUND);
    const cloneEx = new CloneFailedException('Clone failed', gitEx);
    const workflowEx = new WorkflowExecutionException('Workflow failed', cloneEx);
    assert.equal(classifyWorkflowError(workflowEx), QueueErrorClassification.PERMANENT);
  });

  it('does not enter infinite loops on circular cause references', () => {
    const ex1 = new Error('a') as any;
    const ex2 = new Error('b') as any;
    ex1.cause = ex2;
    ex2.cause = ex1; // circular
    // Should not throw / hang
    const result = classifyWorkflowError(ex1);
    assert.ok(
      result === QueueErrorClassification.TRANSIENT || result === QueueErrorClassification.PERMANENT,
    );
  });
});
