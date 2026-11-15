import { describe, expect, it } from 'vitest';
import { getRateLimitPolicies } from './rateLimitPolicy';

describe('getRateLimitPolicies', () => {
  it('uses the task defaults', () => {
    expect(getRateLimitPolicies({})).toEqual({
      loginEmail: {
        maxFailures: 5,
        windowSeconds: 900,
        lockSeconds: 900,
        progressive: true,
        maxLockSeconds: 86400,
      },
      loginIp: { maxFailures: 20, windowSeconds: 900, lockSeconds: 900 },
      registerIp: { maxFailures: 10, windowSeconds: 3600, lockSeconds: 3600 },
    });
  });

  it('allows E2E to reduce limits using environment values', () => {
    expect(
      getRateLimitPolicies({ AUTH_MAX_FAILURES: '3', AUTH_LOCK_SECONDS: '30' }).loginEmail
    ).toEqual({
      maxFailures: 3,
      windowSeconds: 900,
      lockSeconds: 30,
      progressive: true,
      maxLockSeconds: 86400,
    });
  });

  it('rejects invalid values and inconsistent progressive lock bounds', () => {
    expect(() => getRateLimitPolicies({ AUTH_MAX_FAILURES: '0' })).toThrow(/inteiro positivo/);
    expect(() =>
      getRateLimitPolicies({ AUTH_LOCK_SECONDS: '60', AUTH_MAX_LOCK_SECONDS: '30' })
    ).toThrow(/não pode ser menor/);
  });
});
