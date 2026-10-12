import { describe, expect, it } from 'vitest';
import { ConflictError, RateLimitedError } from '../../domain';
import type { PasswordHasher, RateLimiter, RateLimitKeyGenerator, UserRepository } from '../ports';
import { FakeClock, SequentialIdGenerator } from '../testing';
import type { User } from '../types';
import { AuthenticateUser, RegisterUser } from './users';

function setup(existing: User | null = null) {
  let stored = existing;
  const attempts = new Map<string, number>();
  const lockedKeys = new Set<string>();
  const lockedUntil = new Map<string, Date>();
  const clock = new FakeClock(new Date('2026-01-01T12:00:00.000Z'));
  const maxFailuresFor = (key: string) =>
    key.startsWith('login:email:') ? 5 : key.startsWith('login:ip:') ? 20 : 10;
  const rateLimiter: RateLimiter = {
    check: async (key) => {
      const lockUntil = lockedUntil.get(key);
      if (lockedKeys.has(key) || (lockUntil && lockUntil > clock.now())) {
        return {
          allowed: false,
          retryAfterSeconds: lockUntil
            ? Math.ceil((lockUntil.getTime() - clock.now().getTime()) / 1000)
            : 30,
        };
      }
      if (lockUntil) lockedUntil.delete(key);
      const count = attempts.get(key) ?? 0;
      const allowed = count < maxFailuresFor(key);
      return { allowed, retryAfterSeconds: allowed ? 0 : 30 };
    },
    registerFailure: async (key) => {
      const count = (attempts.get(key) ?? 0) + 1;
      if (count >= maxFailuresFor(key)) {
        attempts.delete(key);
        lockedUntil.set(key, new Date(clock.now().getTime() + 30_000));
      } else {
        attempts.set(key, count);
      }
    },
    reset: async (key) => {
      attempts.delete(key);
      lockedKeys.delete(key);
      lockedUntil.delete(key);
    },
  };
  const rateLimitKeys: RateLimitKeyGenerator = {
    loginEmail: (email) => `login:email:${email}`,
    loginIp: (ipAddress) => `login:ip:${ipAddress}`,
    registerIp: (ipAddress) => `register:ip:${ipAddress}`,
  };
  let dummyVerifications = 0;
  const users: UserRepository = {
    findByEmail: async (email) => (stored?.email === email ? stored : null),
    create: async (data) => {
      stored = data;
      return stored;
    },
  };
  const passwords: PasswordHasher = {
    hash: async (value) => `hashed:${value}`,
    verify: async (plain, hash) => hash === `hashed:${plain}`,
    verifyDummy: async () => {
      dummyVerifications += 1;
    },
  };
  return {
    users,
    passwords,
    rateLimiter,
    rateLimitKeys,
    attempts,
    lockedKeys,
    clock,
    get dummyVerifications() {
      return dummyVerifications;
    },
    get stored() {
      return stored;
    },
  };
}

describe('user use cases', () => {
  it('registers a normalized user with hashed password and generated id', async () => {
    const deps = setup();
    const user = await new RegisterUser(
      deps.users,
      deps.passwords,
      new SequentialIdGenerator('user'),
      deps.rateLimiter,
      deps.rateLimitKeys
    ).execute({ name: ' Ana ', email: 'ANA@example.com', password: 'password123' }, '127.0.0.1');
    expect(user).toEqual({
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'hashed:password123',
    });
  });

  it('rejects duplicate email and invalid registration data', async () => {
    const existing: User = {
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'hashed:password123',
    };
    const deps = setup(existing);
    const register = new RegisterUser(
      deps.users,
      deps.passwords,
      new SequentialIdGenerator(),
      deps.rateLimiter,
      deps.rateLimitKeys
    );
    await expect(
      register.execute(
        { name: 'Ana', email: 'ANA@example.com', password: 'password123' },
        '127.0.0.1'
      )
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      register.execute({ email: 'invalid', password: 'x' }, '127.0.0.1')
    ).rejects.toHaveProperty('issues');
  });

  it('authenticates valid credentials and returns null for either failure', async () => {
    const deps = setup();
    const user = await new RegisterUser(
      deps.users,
      deps.passwords,
      new SequentialIdGenerator(),
      deps.rateLimiter,
      deps.rateLimitKeys
    ).execute({ name: 'Ana', email: 'ana@example.com', password: 'password123' }, '127.0.0.1');
    const authenticate = new AuthenticateUser(
      deps.users,
      deps.passwords,
      deps.rateLimiter,
      deps.rateLimitKeys
    );
    await expect(
      authenticate.execute('ANA@example.com', 'password123', '127.0.0.1')
    ).resolves.toEqual(user);
    expect(deps.attempts.has('login:email:ana@example.com')).toBe(false);
    await expect(
      authenticate.execute('missing@example.com', 'password123', '127.0.0.1')
    ).resolves.toBeNull();
    await expect(
      authenticate.execute('ana@example.com', 'wrong-password', '127.0.0.1')
    ).resolves.toBeNull();
    expect(deps.dummyVerifications).toBe(1);
    expect(deps.attempts.get('login:email:ana@example.com')).toBe(1);
    expect(deps.attempts.get('login:ip:127.0.0.1')).toBe(2);
  });

  it('rejects locked login keys before checking the password', async () => {
    const deps = setup();
    deps.lockedKeys.add('login:email:ana@example.com');
    const authenticate = new AuthenticateUser(
      deps.users,
      deps.passwords,
      deps.rateLimiter,
      deps.rateLimitKeys
    );

    await expect(authenticate.execute('ana@example.com', 'secret', '127.0.0.1')).rejects.toEqual(
      new RateLimitedError(30)
    );
    expect(deps.dummyVerifications).toBe(0);
  });

  it('blocks the sixth login attempt until the lock expires on the fake clock', async () => {
    const existing: User = {
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'hashed:correct-password',
    };
    const deps = setup(existing);
    const authenticate = new AuthenticateUser(
      deps.users,
      deps.passwords,
      deps.rateLimiter,
      deps.rateLimitKeys
    );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        authenticate.execute('ana@example.com', 'wrong-password', '203.0.113.4')
      ).resolves.toBeNull();
    }

    await expect(
      authenticate.execute('ana@example.com', 'correct-password', '203.0.113.4')
    ).rejects.toEqual(new RateLimitedError(30));

    deps.clock.set(new Date(deps.clock.now().getTime() + 30_000));
    await expect(
      authenticate.execute('ana@example.com', 'correct-password', '203.0.113.4')
    ).resolves.toEqual(existing);
  });

  it('rejects registration when its IP key is locked', async () => {
    const deps = setup();
    deps.lockedKeys.add('register:ip:203.0.113.4');
    const register = new RegisterUser(
      deps.users,
      deps.passwords,
      new SequentialIdGenerator(),
      deps.rateLimiter,
      deps.rateLimitKeys
    );

    await expect(
      register.execute(
        { name: 'Ana', email: 'ana@example.com', password: 'password123' },
        '203.0.113.4'
      )
    ).rejects.toEqual(new RateLimitedError(30));
    expect(deps.attempts.has('register:ip:203.0.113.4')).toBe(false);
  });
});
