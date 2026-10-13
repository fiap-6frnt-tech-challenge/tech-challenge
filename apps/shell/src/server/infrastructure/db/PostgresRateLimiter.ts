import 'server-only';
import { eq, sql } from 'drizzle-orm';
import type { Clock, RateLimiter } from '@bytebank/core/application';
import type { Database } from '@/db';
import { authAttempts } from '@/db/schema';
import type { RateLimitPolicies, RateLimitPolicy } from '../security/rateLimitPolicy';

function policyForKey(key: string, policies: RateLimitPolicies): RateLimitPolicy {
  if (key.startsWith('login:email:')) return policies.loginEmail;
  if (key.startsWith('login:ip:')) return policies.loginIp;
  if (key.startsWith('register:ip:')) return policies.registerIp;
  throw new Error('Escopo de rate limit desconhecido');
}

function lockDurationSeconds(policy: RateLimitPolicy, previousLocks: number) {
  if (!policy.progressive) return policy.lockSeconds;
  const maxLockSeconds = policy.maxLockSeconds ?? policy.lockSeconds;
  const maxLockLevel = Math.ceil(Math.log2(maxLockSeconds / policy.lockSeconds));
  const multiplier = 2 ** Math.min(previousLocks, maxLockLevel);
  return Math.min(maxLockSeconds, policy.lockSeconds * multiplier);
}

export class PostgresRateLimiter implements RateLimiter {
  constructor(
    private readonly db: Database,
    private readonly policies: RateLimitPolicies,
    private readonly clock: Clock
  ) {}

  async check(key: string): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    policyForKey(key, this.policies);
    const [row] = await this.db
      .select({ lockedUntil: authAttempts.lockedUntil })
      .from(authAttempts)
      .where(eq(authAttempts.key, key))
      .limit(1);
    const now = this.clock.now();

    if (!row?.lockedUntil || row.lockedUntil <= now) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((row.lockedUntil.getTime() - now.getTime()) / 1000)),
    };
  }

  async failureCount(key: string): Promise<number> {
    const policy = policyForKey(key, this.policies);
    const [row] = await this.db
      .select({ failures: authAttempts.failures, windowStart: authAttempts.windowStart })
      .from(authAttempts)
      .where(eq(authAttempts.key, key))
      .limit(1);

    if (!row) return 0;
    const cutoff = new Date(this.clock.now().getTime() - policy.windowSeconds * 1000);
    return row.windowStart <= cutoff ? 0 : row.failures;
  }

  async registerFailure(key: string): Promise<void> {
    const policy = policyForKey(key, this.policies);
    const now = this.clock.now();
    const cutoff = new Date(now.getTime() - policy.windowSeconds * 1000);
    const initialLockDuration = lockDurationSeconds(policy, 0);
    const initialLockedUntil = new Date(now.getTime() + initialLockDuration * 1000);
    const startsLocked = policy.maxFailures <= 1;

    const activeLock = sql`(${authAttempts.lockedUntil} IS NOT NULL AND ${authAttempts.lockedUntil} > ${now})`;
    const windowExpired = sql`(${authAttempts.windowStart} <= ${cutoff})`;
    const nextFailures = sql`CASE WHEN ${windowExpired} THEN 1 ELSE ${authAttempts.failures} + 1 END`;
    const reachesLimit = sql`((NOT ${activeLock}) AND (${nextFailures} >= ${policy.maxFailures}))`;
    const maxLockLevel = policy.progressive
      ? Math.ceil(Math.log2((policy.maxLockSeconds ?? policy.lockSeconds) / policy.lockSeconds))
      : 0;
    const durationSeconds = policy.progressive
      ? sql`LEAST(${policy.maxLockSeconds ?? policy.lockSeconds}, ${policy.lockSeconds} * POWER(2, LEAST(${authAttempts.lockCount}, ${maxLockLevel})))`
      : sql`${policy.lockSeconds}`;
    const nextLockedUntil = sql`CASE
      WHEN ${activeLock} THEN ${authAttempts.lockedUntil}
      WHEN ${reachesLimit} THEN ${now}::timestamptz + make_interval(secs => (${durationSeconds})::double precision)
      ELSE NULL
    END`;

    await this.db
      .insert(authAttempts)
      .values({
        key,
        failures: startsLocked ? 0 : 1,
        windowStart: startsLocked ? initialLockedUntil : now,
        lockedUntil: startsLocked ? initialLockedUntil : null,
        lockCount: startsLocked && policy.progressive ? Math.min(1, maxLockLevel) : 0,
      })
      .onConflictDoUpdate({
        target: authAttempts.key,
        set: {
          failures: sql`CASE
            WHEN ${activeLock} THEN ${authAttempts.failures}
            WHEN ${reachesLimit} THEN 0
            ELSE ${nextFailures}
          END`,
          windowStart: sql`CASE
            WHEN ${activeLock} THEN ${authAttempts.windowStart}
            WHEN ${reachesLimit} THEN ${nextLockedUntil}
            WHEN ${windowExpired} THEN ${now}
            ELSE ${authAttempts.windowStart}
          END`,
          lockedUntil: nextLockedUntil,
          lockCount: policy.progressive
            ? sql`CASE WHEN ${reachesLimit} THEN LEAST(${authAttempts.lockCount} + 1, ${maxLockLevel}) ELSE ${authAttempts.lockCount} END`
            : authAttempts.lockCount,
        },
      });
  }

  async reset(key: string): Promise<void> {
    await this.db.delete(authAttempts).where(eq(authAttempts.key, key));
  }
}
