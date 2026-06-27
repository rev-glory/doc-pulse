import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RetryPolicyService } from '../../src/modules/ai/services/retry-policy.service';
import { DelayedRetryWorkflowError } from '../../src/modules/queue/types/queue-errors';

describe('RetryPolicyService Unit Tests', () => {
  const service = new RetryPolicyService();

  it('should parse RetryInfo.retryDelay and throw DelayedRetryWorkflowError on 429 when delay >= 5000ms', async () => {
    const error429 = new Error('HTTP 429 Resource Exhausted: RetryInfo.retryDelay = 52s');
    
    await assert.rejects(
      async () => {
        await service.execute('testOp', async () => {
          throw error429;
        });
      },
      (err: any) => {
        assert.ok(err instanceof DelayedRetryWorkflowError, 'Error should be instance of DelayedRetryWorkflowError');
        assert.equal(err.delayMs, 52000, 'Delay should be extracted as 52000ms');
        return true;
      }
    );
  });

  it('should retry transient non-rate-limit errors with exponential backoff', async () => {
    let attempts = 0;
    const result = await service.execute(
      'testOpTransient',
      async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('503 Service Unavailable');
        }
        return 'success';
      },
      { baseDelayMs: 10, maxDelayMs: 50 }
    );

    assert.equal(result, 'success');
    assert.equal(attempts, 2);
  });
});
