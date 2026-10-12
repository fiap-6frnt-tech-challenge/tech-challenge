import { like } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { authAttempts } from '@/db/schema';
import { FakeClock } from '@bytebank/core/application';
import { PostgresRateLimiter } from './PostgresRateLimiter';
import type { RateLimitPolicies } from '../security/rateLimitPolicy';

const keyMarker = `it-${randomUUID().slice(0, 8)}-rate-limit`;
const policies: RateLimitPolicies = {
  loginEmail: {
    maxFailures: 2,
    windowSeconds: 60,
    lockSeconds: 10,
    progressive: true,
    maxLockSeconds: 40,
  },
  loginIp: { maxFailures: 3, windowSeconds: 60, lockSeconds: 15 },
  registerIp: { maxFailures: 2, windowSeconds: 3600, lockSeconds: 3600 },
};
const clock = new FakeClock(new Date('2026-01-01T12:00:00.000Z'));
const limiter = new PostgresRateLimiter(db, policies, clock);

afterAll(async () => {
  await db.delete(authAttempts).where(like(authAttempts.key, `%${keyMarker}%`));
});

describe('PostgresRateLimiter', () => {
  it('returns the number of failures inside the active window', async () => {
    const key = `login:ip:${keyMarker}-captcha`;
    const initialTime = clock.now();

    await expect(limiter.failureCount(key)).resolves.toBe(0);
    await limiter.registerFailure(key);
    await limiter.registerFailure(key);
    await expect(limiter.failureCount(key)).resolves.toBe(2);

    clock.set(new Date(initialTime.getTime() + 61_000));
    await expect(limiter.failureCount(key)).resolves.toBe(0);
    clock.set(initialTime);
    await limiter.reset(key);
  });

  it('applies an atomic threshold and doubles consecutive email locks up to the cap', async () => {
    const key = `login:email:${keyMarker}-progressive`;

    await expect(limiter.check(key)).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
    await limiter.registerFailure(key);
    await expect(limiter.check(key)).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
    await limiter.registerFailure(key);
    await expect(limiter.check(key)).resolves.toEqual({ allowed: false, retryAfterSeconds: 10 });

    clock.set(new Date(clock.now().getTime() + 10_000));
    await expect(limiter.check(key)).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
    await limiter.registerFailure(key);
    await limiter.registerFailure(key);
    await expect(limiter.check(key)).resolves.toEqual({ allowed: false, retryAfterSeconds: 20 });

    clock.set(new Date(clock.now().getTime() + 20_000));
    await limiter.registerFailure(key);
    await limiter.registerFailure(key);
    await expect(limiter.check(key)).resolves.toEqual({ allowed: false, retryAfterSeconds: 40 });

    clock.set(new Date(clock.now().getTime() + 40_000));
    await limiter.registerFailure(key);
    await limiter.registerFailure(key);
    await expect(limiter.check(key)).resolves.toEqual({ allowed: false, retryAfterSeconds: 40 });
  });

  it('starts a fresh failure window after the configured window expires', async () => {
    const key = `login:ip:${keyMarker}-window`;

    await limiter.registerFailure(key);
    await limiter.registerFailure(key);
    clock.set(new Date(clock.now().getTime() + 61_000));
    await limiter.registerFailure(key);
    await expect(limiter.check(key)).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
    await limiter.registerFailure(key);
    await expect(limiter.check(key)).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
    await limiter.registerFailure(key);
    await expect(limiter.check(key)).resolves.toEqual({ allowed: false, retryAfterSeconds: 15 });
  });

  it('uses the fixed registration lock duration and can reset a key', async () => {
    const key = `register:ip:${keyMarker}-register`;

    await limiter.registerFailure(key);
    await limiter.registerFailure(key);
    await expect(limiter.check(key)).resolves.toEqual({ allowed: false, retryAfterSeconds: 3600 });
    await limiter.reset(key);
    await expect(limiter.check(key)).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
  });
});
