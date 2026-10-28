import { describe, expect, it, vi } from 'vitest';
import {
  ConflictError,
  RateLimitedError,
  TurnstileRequiredError,
  ValidationError,
} from '../../domain';
import type {
  CaptchaVerifier,
  LegacyUserRepository,
  PasswordBreachChecker,
  PasswordHasher,
  RateLimiter,
  RateLimitKeyGenerator,
  UserRepository,
} from '../ports';
import { FakeClock, MemoryAuditLogger, SequentialIdGenerator } from '../testing';
import type { LegacyUser, User } from '../types';
import {
  AuthenticateUser,
  BREACHED_PASSWORD_MESSAGE,
  EncryptLegacyUsers,
  RegisterUser,
} from './users';

const strongPassword = 'Bytebank-Teste-2026';

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
    failureCount: async (key) => attempts.get(key) ?? 0,
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
  const passwordHashUpdates: Array<{ id: string; passwordHash: string }> = [];
  const users: UserRepository = {
    findByEmail: async (email) => (stored?.email === email ? stored : null),
    create: async (data) => {
      stored = data;
      return stored;
    },
    updatePasswordHash: async (id, passwordHash) => {
      passwordHashUpdates.push({ id, passwordHash });
      if (stored?.id === id) stored = { ...stored, passwordHash };
    },
  };
  const passwords: PasswordHasher = {
    hash: async (value) => `hashed:${value}`,
    verify: async (plain, hash) => hash === `hashed:${plain}` || hash === `legacy:${plain}`,
    verifyDummy: async () => {
      dummyVerifications += 1;
    },
    needsRehash: (hash) => hash.startsWith('legacy:'),
  };
  const breachedPasswords = new Set<string>();
  const breachChecks: string[] = [];
  const breachChecker: PasswordBreachChecker = {
    isBreached: async (plain) => {
      breachChecks.push(plain);
      return breachedPasswords.has(plain);
    },
  };
  return {
    users,
    passwords,
    audit: new MemoryAuditLogger(),
    breachChecker,
    breachedPasswords,
    breachChecks,
    passwordHashUpdates,
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

function registerUser(deps: ReturnType<typeof setup>, ids = new SequentialIdGenerator()) {
  return new RegisterUser(
    deps.users,
    deps.passwords,
    ids,
    deps.rateLimiter,
    deps.rateLimitKeys,
    deps.breachChecker,
    deps.audit
  );
}

describe('user use cases', () => {
  it('rejects OAuth-only accounts through the dummy password check and counts the failed attempt', async () => {
    const deps = setup({
      id: 'oauth-user',
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: '',
    });
    const authenticate = new AuthenticateUser(
      deps.users,
      deps.passwords,
      deps.rateLimiter,
      deps.rateLimitKeys,
      deps.audit
    );
    expect(await authenticate.execute('ana@example.com', strongPassword, '127.0.0.1')).toBeNull();
    expect(deps.dummyVerifications).toBe(1);
    expect(deps.attempts.get('login:email:ana@example.com')).toBe(1);
  });
  it('registers a normalized user with hashed password and generated id', async () => {
    const deps = setup();
    const user = await registerUser(deps, new SequentialIdGenerator('user')).execute(
      { name: ' Ana ', email: 'ANA@example.com', password: strongPassword },
      '127.0.0.1'
    );
    expect(user).toEqual({
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: `hashed:${strongPassword}`,
    });
    expect(deps.breachChecks).toEqual([strongPassword]);
  });

  it('rejects duplicate email and invalid registration data', async () => {
    const existing: User = {
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: `hashed:${strongPassword}`,
    };
    const deps = setup(existing);
    const register = registerUser(deps);
    await expect(
      register.execute(
        { name: 'Ana', email: 'ANA@example.com', password: strongPassword },
        '127.0.0.1'
      )
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      register.execute({ email: 'invalid', password: 'x' }, '127.0.0.1')
    ).rejects.toHaveProperty('issues');
  });

  it('rejects passwords shorter than 12 characters before checking for breaches', async () => {
    const deps = setup();

    const error = await registerUser(deps)
      .execute({ name: 'Ana', email: 'ana@example.com', password: 'segredo1234' }, '127.0.0.1')
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).issues).toEqual([
      expect.objectContaining({ path: ['password'], code: 'too_small', minimum: 12 }),
    ]);
    expect(deps.breachChecks).toEqual([]);
    expect(deps.stored).toBeNull();
  });

  it('rejects a breached password with a clear message and creates no user', async () => {
    const deps = setup();
    deps.breachedPasswords.add('password123456');

    const error = await registerUser(deps)
      .execute({ name: 'Ana', email: 'ana@example.com', password: 'password123456' }, '127.0.0.1')
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).issues).toEqual([
      { code: 'custom', path: ['password'], message: BREACHED_PASSWORD_MESSAGE },
    ]);
    expect(deps.stored).toBeNull();
  });

  it('authenticates valid credentials and returns null for either failure', async () => {
    const deps = setup();
    const user = await registerUser(deps).execute(
      { name: 'Ana', email: 'ana@example.com', password: strongPassword },
      '127.0.0.1'
    );
    const authenticate = new AuthenticateUser(
      deps.users,
      deps.passwords,
      deps.rateLimiter,
      deps.rateLimitKeys,
      deps.audit
    );
    await expect(
      authenticate.execute('ANA@example.com', strongPassword, '127.0.0.1')
    ).resolves.toEqual(user);
    expect(deps.passwordHashUpdates).toEqual([]);
    expect(deps.attempts.has('login:email:ana@example.com')).toBe(false);
    await expect(
      authenticate.execute('missing@example.com', strongPassword, '127.0.0.1')
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
      deps.rateLimitKeys,
      deps.audit
    );

    await expect(authenticate.execute('ana@example.com', 'secret', '127.0.0.1')).rejects.toEqual(
      new RateLimitedError(30)
    );
    expect(deps.dummyVerifications).toBe(0);
  });

  it('requires Turnstile after three failures and verifies each subsequent attempt', async () => {
    const existing: User = {
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'hashed:correct-password',
    };
    const deps = setup(existing);
    const verifiedTokens: string[] = [];
    const captcha: CaptchaVerifier = {
      isEnabled: () => true,
      verify: async (token) => {
        verifiedTokens.push(token);
        return token === 'valid-token';
      },
    };
    const authenticate = new AuthenticateUser(
      deps.users,
      deps.passwords,
      deps.rateLimiter,
      deps.rateLimitKeys,
      deps.audit,
      captcha
    );

    await expect(
      authenticate.execute('ana@example.com', 'wrong-password', '203.0.113.4')
    ).resolves.toBeNull();
    await expect(
      authenticate.execute('ana@example.com', 'wrong-password', '203.0.113.4')
    ).resolves.toBeNull();
    await expect(
      authenticate.execute('ana@example.com', 'wrong-password', '203.0.113.4')
    ).rejects.toBeInstanceOf(TurnstileRequiredError);
    await expect(
      authenticate.execute('ana@example.com', 'correct-password', '203.0.113.4')
    ).rejects.toBeInstanceOf(TurnstileRequiredError);
    await expect(
      authenticate.execute('ana@example.com', 'correct-password', '203.0.113.4', 'bad-token')
    ).rejects.toBeInstanceOf(TurnstileRequiredError);
    expect(verifiedTokens).toEqual(['bad-token']);

    await expect(
      authenticate.execute('ana@example.com', 'correct-password', '203.0.113.4', 'valid-token')
    ).resolves.toEqual(existing);
    expect(verifiedTokens).toEqual(['bad-token', 'valid-token']);
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
      deps.rateLimitKeys,
      deps.audit
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
    const register = registerUser(deps);

    await expect(
      register.execute(
        { name: 'Ana', email: 'ana@example.com', password: strongPassword },
        '203.0.113.4'
      )
    ).rejects.toEqual(new RateLimitedError(30));
    expect(deps.attempts.has('register:ip:203.0.113.4')).toBe(false);
    expect(deps.breachChecks).toEqual([]);
  });

  it('migrates a legacy password hash on the first successful login only', async () => {
    const legacy: User = {
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'legacy:Senha123!',
    };
    const deps = setup(legacy);
    const authenticate = new AuthenticateUser(
      deps.users,
      deps.passwords,
      deps.rateLimiter,
      deps.rateLimitKeys,
      deps.audit
    );

    await expect(
      authenticate.execute('ana@example.com', 'wrong-password', '127.0.0.1')
    ).resolves.toBeNull();
    expect(deps.passwordHashUpdates).toEqual([]);

    await expect(
      authenticate.execute('ana@example.com', 'Senha123!', '127.0.0.1')
    ).resolves.toEqual({ ...legacy, passwordHash: 'hashed:Senha123!' });
    expect(deps.passwordHashUpdates).toEqual([{ id: 'u1', passwordHash: 'hashed:Senha123!' }]);
    expect(deps.stored?.passwordHash).toBe('hashed:Senha123!');

    await expect(
      authenticate.execute('ana@example.com', 'Senha123!', '127.0.0.1')
    ).resolves.toEqual({ ...legacy, passwordHash: 'hashed:Senha123!' });
    expect(deps.passwordHashUpdates).toHaveLength(1);
  });
});

describe('user use cases audit trail', () => {
  const ana: User = {
    id: 'u1',
    name: 'Ana',
    email: 'ana@example.com',
    passwordHash: 'hashed:correct-password',
  };
  const authenticateWith = (deps: ReturnType<typeof setup>) =>
    new AuthenticateUser(
      deps.users,
      deps.passwords,
      deps.rateLimiter,
      deps.rateLimitKeys,
      deps.audit
    );

  it('records a wrong password as auth.login.failure without the password or the raw e-mail', async () => {
    const deps = setup(ana);

    await authenticateWith(deps).execute('ANA@example.com', 'senha-errada-123', '203.0.113.4');

    expect(deps.audit.events).toEqual([
      {
        event: 'auth.login.failure',
        outcome: 'failure',
        userId: 'u1',
        email: 'a***@e***.com',
        reason: 'invalid_password',
      },
    ]);
    const logged = JSON.stringify(deps.audit.events);
    expect(logged).not.toContain('senha-errada-123');
    expect(logged).not.toContain('ana@example.com');
    expect(logged).not.toContain('203.0.113.4');
  });

  it('records unknown accounts and successful logins', async () => {
    const deps = setup(ana);
    const authenticate = authenticateWith(deps);

    await authenticate.execute('bia@example.com', 'correct-password', '203.0.113.4');
    await authenticate.execute('ana@example.com', 'correct-password', '203.0.113.4');

    expect(deps.audit.events).toEqual([
      expect.objectContaining({
        event: 'auth.login.failure',
        email: 'b***@e***.com',
        reason: 'unknown_user',
        userId: undefined,
      }),
      { event: 'auth.login.success', outcome: 'success', userId: 'u1', email: 'a***@e***.com' },
    ]);
  });

  it('records the lockout once and every attempt rejected while locked', async () => {
    const deps = setup(ana);
    const authenticate = authenticateWith(deps);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await authenticate.execute('ana@example.com', 'wrong-password', '203.0.113.4');
    }
    await expect(
      authenticate.execute('ana@example.com', 'correct-password', '203.0.113.4')
    ).rejects.toBeInstanceOf(RateLimitedError);

    expect(deps.audit.events.map(({ event }) => event)).toEqual([
      ...Array(5).fill('auth.login.failure'),
      'auth.login.locked',
      'rate_limit.hit',
    ]);
    expect(deps.audit.events[5]).toMatchObject({ userId: 'u1', reason: 'too_many_failures' });
    expect(deps.audit.events[6]).toEqual({
      event: 'rate_limit.hit',
      outcome: 'denied',
      email: 'a***@e***.com',
      reason: 'login_email',
    });
  });

  it('records a missing Turnstile challenge as a login failure', async () => {
    const deps = setup(ana);
    deps.attempts.set('login:email:ana@example.com', 3);
    const captcha: CaptchaVerifier = { isEnabled: () => true, verify: async () => false };
    const authenticate = new AuthenticateUser(
      deps.users,
      deps.passwords,
      deps.rateLimiter,
      deps.rateLimitKeys,
      deps.audit,
      captcha
    );

    await expect(
      authenticate.execute('ana@example.com', 'correct-password', '203.0.113.4', 'token-secreto')
    ).rejects.toBeInstanceOf(TurnstileRequiredError);

    expect(deps.audit.events).toEqual([
      expect.objectContaining({ event: 'auth.login.failure', reason: 'captcha_required' }),
    ]);
    expect(JSON.stringify(deps.audit.events)).not.toContain('token-secreto');
  });

  it('records registrations, taken e-mails and blocked registration IPs', async () => {
    const deps = setup(ana);
    const register = registerUser(deps, new SequentialIdGenerator('user'));

    await expect(
      register.execute(
        { name: 'Ana', email: 'ana@example.com', password: strongPassword },
        '203.0.113.4'
      )
    ).rejects.toBeInstanceOf(ConflictError);
    await register.execute(
      { name: 'Bia', email: 'bia@example.com', password: strongPassword },
      '203.0.113.4'
    );
    deps.lockedKeys.add('register:ip:203.0.113.4');
    await expect(
      register.execute(
        { name: 'Caio', email: 'caio@example.com', password: strongPassword },
        '203.0.113.4'
      )
    ).rejects.toBeInstanceOf(RateLimitedError);

    expect(deps.audit.events).toEqual([
      { event: 'auth.register', outcome: 'failure', email: 'a***@e***.com', reason: 'email_taken' },
      { event: 'auth.register', outcome: 'success', userId: 'user-1', email: 'b***@e***.com' },
      { event: 'rate_limit.hit', outcome: 'denied', reason: 'register_ip' },
    ]);
    expect(JSON.stringify(deps.audit.events)).not.toContain(strongPassword);
  });
});

describe('EncryptLegacyUsers', () => {
  class MemoryLegacyUsers implements LegacyUserRepository {
    readonly encrypted = new Map<string, LegacyUser>();
    readonly failing = new Set<string>();
    constructor(readonly rows: LegacyUser[]) {}
    async listLegacy(limit: number, afterId?: string): Promise<LegacyUser[]> {
      return this.rows
        .filter((row) => !this.encrypted.has(row.id) && (!afterId || row.id > afterId))
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, limit);
    }
    async markEncrypted(user: LegacyUser): Promise<boolean> {
      if (this.failing.has(user.id)) throw new Error('E-mail já cifrado em outro usuário');
      if (this.encrypted.has(user.id)) return false;
      this.encrypted.set(user.id, user);
      return true;
    }
  }

  const legacy = (id: string): LegacyUser => ({
    id,
    name: `Nome ${id}`,
    email: `${id}@bytebank.test`,
  });

  it('cifra todos os legados em lotes, com o nome e o e-mail de cada um', async () => {
    const repository = new MemoryLegacyUsers(['c', 'a', 'b'].map(legacy));

    await expect(new EncryptLegacyUsers(repository).execute(2)).resolves.toEqual({
      migrated: 3,
      failed: [],
    });
    expect(repository.encrypted.get('b')).toEqual(legacy('b'));
  });

  it('é idempotente: a segunda execução não encontra legados', async () => {
    const useCase = new EncryptLegacyUsers(new MemoryLegacyUsers([legacy('a')]));
    await useCase.execute();
    await expect(useCase.execute()).resolves.toEqual({ migrated: 0, failed: [] });
  });

  it('registra a falha e segue para os próximos sem repetir o mesmo usuário', async () => {
    const repository = new MemoryLegacyUsers(['a', 'b'].map(legacy));
    repository.failing.add('a');

    await expect(new EncryptLegacyUsers(repository).execute(1)).resolves.toEqual({
      migrated: 1,
      failed: [{ id: 'a', reason: 'E-mail já cifrado em outro usuário' }],
    });
    expect([...repository.encrypted.keys()]).toEqual(['b']);
  });

  it('não conta o usuário que outra execução já cifrou', async () => {
    const repository = new MemoryLegacyUsers([legacy('a')]);
    vi.spyOn(repository, 'markEncrypted').mockResolvedValue(false);

    await expect(new EncryptLegacyUsers(repository).execute()).resolves.toEqual({
      migrated: 0,
      failed: [],
    });
  });
});
