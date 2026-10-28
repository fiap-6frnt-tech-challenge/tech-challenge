import { describe, expect, it } from 'vitest';
import { AuthenticationError, RateLimitedError } from '../../domain';
import type {
  Cipher,
  PasswordHasher,
  RateLimiter,
  MfaRepository,
  MfaState,
  TotpProvider,
} from '../ports';
import { FakeClock, MemoryAuditLogger } from '../testing';
import { MfaService, MfaRequiredError, MfaInvalidCodeError } from './mfa';

function setup(prefixes: string[] = []) {
  const clock = new FakeClock(new Date('2026-01-01T12:00:00Z'));
  const state: MfaState = {
    userId: 'u1',
    enabled: false,
    sessionVersion: 0,
    secretEnc: null,
    pendingSecretEnc: null,
    pendingExpiresAt: null,
    lastUsedStep: null,
    passwordHash: 'hash:password',
    recoveryCodesRemaining: 0,
  };
  const codes = new Map<string, string>();
  let dummyVerifications = 0;
  let failures = 0,
    sequence = 0,
    verificationCalls = 0;
  const repo: MfaRepository = {
    find: async (id) => (id === state.userId ? { ...state } : null),
    stage: async (_, encrypted, expires, expected) => {
      if (state.enabled || expected !== state.passwordHash) return false;
      state.pendingSecretEnc = encrypted;
      state.pendingExpiresAt = expires;
      return true;
    },
    activate: async (
      _,
      expected,
      now,
      step,
      recovery,
      passwordHash,
      secretEnc,
      expectedSessionVersion?: number
    ) => {
      if (
        state.enabled ||
        state.pendingSecretEnc !== expected ||
        !state.pendingExpiresAt ||
        state.pendingExpiresAt <= now ||
        state.passwordHash !== passwordHash ||
        (expectedSessionVersion !== undefined && state.sessionVersion !== expectedSessionVersion)
      )
        return false;
      state.enabled = true;
      state.sessionVersion++;
      state.secretEnc = secretEnc;
      state.pendingSecretEnc = null;
      state.pendingExpiresAt = null;
      state.lastUsedStep = step;
      for (const code of recovery) codes.set(code.id, code.hash);
      state.recoveryCodesRemaining = codes.size;
      return true;
    },
    disable: async (_, encrypted, passwordHash) => {
      if (!state.enabled || state.secretEnc !== encrypted || state.passwordHash !== passwordHash)
        return false;
      state.enabled = false;
      state.secretEnc = null;
      codes.clear();
      state.recoveryCodesRemaining = 0;
      return true;
    },
    consumeTotp: async (_, encrypted, step, passwordHash) => {
      if (
        !state.enabled ||
        state.secretEnc !== encrypted ||
        state.passwordHash !== passwordHash ||
        step <= (state.lastUsedStep ?? -1)
      )
        return false;
      state.lastUsedStep = step;
      return true;
    },
    findRecovery: async (_, id) => codes.get(id) ?? null,
    consumeRecovery: async (_, id, hash, encrypted, passwordHash) => {
      if (
        !state.enabled ||
        state.secretEnc !== encrypted ||
        state.passwordHash !== passwordHash ||
        codes.get(id) !== hash
      )
        return false;
      codes.delete(id);
      state.recoveryCodesRemaining = codes.size;
      return true;
    },
  };
  const passwords: PasswordHasher = {
    hash: async (p) => `hash:${p}`,
    verify: async (p, h) => {
      verificationCalls++;
      return h === `hash:${p}`;
    },
    verifyDummy: async () => {
      dummyVerifications++;
    },
    needsRehash: () => false,
  };
  const cipher = {
    encryptText: (p: string, c: string) => `${c}|${p}`,
    decryptText: (p: string, c: string) => {
      if (!p.startsWith(`${c}|`)) throw new Error('context');
      return p.slice(c.length + 1);
    },
  } as Cipher;
  const totp: TotpProvider = {
    create: () => ({ secret: 'SECRET', uri: 'otpauth://totp/test' }),
    verify: (_, token, now) => (token === '123456' ? Math.floor(now.getTime() / 30000) : null),
  };
  const limiter: RateLimiter = {
    check: async () => ({ allowed: failures < 5, retryAfterSeconds: failures >= 5 ? 30 : 0 }),
    registerFailure: async () => {
      failures++;
    },
    reset: async () => {
      failures = 0;
    },
    failureCount: async () => failures,
  };
  const audit = new MemoryAuditLogger();
  const service = new MfaService(
    repo,
    passwords,
    cipher,
    totp,
    limiter,
    clock,
    {
      next: () =>
        (prefixes.shift() ?? (++sequence).toString(16).padStart(8, '0')) + 'abcdef1234567890',
    },
    audit
  );
  const enroll = async () => {
    await service.setup('u1', 'password');
    return service.enable('u1', '123456');
  };
  return {
    service,
    audit,
    repo,
    cipher,
    passwords,
    totp,
    clock,
    state,
    codes,
    enroll,
    get dummyVerifications() {
      return dummyVerifications;
    },
    get failures() {
      return failures;
    },
    get verificationCalls() {
      return verificationCalls;
    },
  };
}

describe('MfaService', () => {
  it('reports availability without exposing secrets', async () => {
    const d = setup();
    expect(await d.service.status('u1')).toEqual({
      enabled: false,
      canEnroll: true,
      recoveryCodesRemaining: 0,
    });
    d.state.passwordHash = '';
    expect((await d.service.status('u1')).canEnroll).toBe(false);
    await expect(d.service.status('missing')).rejects.toBeInstanceOf(AuthenticationError);
  });
  it('requires a password, stages encrypted secret for ten minutes, preserves failures', async () => {
    const d = setup();
    await expect(d.service.setup('u1', 'wrong')).rejects.toBeInstanceOf(AuthenticationError);
    expect(d.failures).toBe(1);
    expect(await d.service.setup('u1', 'password')).toEqual({
      secret: 'SECRET',
      uri: 'otpauth://totp/test',
    });
    expect(d.state.pendingExpiresAt?.getTime()).toBe(d.clock.now().getTime() + 600000);
    expect(d.cipher.decryptText(d.state.pendingSecretEnc!, 'user:u1:mfa')).toBe(
      JSON.stringify({ secret: 'SECRET', passwordHash: 'hash:password' })
    );
    expect(d.failures).toBe(1);
  });
  it('activates once, emits ten unique codes and stores complete hashes only', async () => {
    const d = setup();
    const result = await d.enroll();
    expect(result).toEqual({
      recoveryCodes: [
        '00000001-00000002-00000003',
        '00000004-00000005-00000006',
        '00000007-00000008-00000009',
        '0000000a-0000000b-0000000c',
        '0000000d-0000000e-0000000f',
        '00000010-00000011-00000012',
        '00000013-00000014-00000015',
        '00000016-00000017-00000018',
        '00000019-0000001a-0000001b',
        '0000001c-0000001d-0000001e',
      ],
      sessionVersion: 1,
    });
    expect(result.recoveryCodes[0]).toBe('00000001-00000002-00000003');
    expect(result.recoveryCodes).toHaveLength(10);
    expect(new Set(result.recoveryCodes).size).toBe(10);
    for (const code of result.recoveryCodes) {
      expect(code).toMatch(/^[a-f0-9]{8}-[a-f0-9]{8}-[a-f0-9]{8}$/);
      expect(d.codes.get(code.slice(0, 8))).toBe(`hash:${code}`);
    }
    expect(await d.service.status('u1')).toEqual({
      enabled: true,
      canEnroll: true,
      recoveryCodesRemaining: 10,
    });
    await expect(d.service.setup('u1', 'password')).rejects.toBeInstanceOf(AuthenticationError);
    await expect(d.service.enable('u1', '123456')).rejects.toBeInstanceOf(MfaInvalidCodeError);
  });
  it('rejects expired setup and setup invalidated by password replacement', async () => {
    const d = setup();
    await d.service.setup('u1', 'password');
    d.clock.set(new Date(d.clock.now().getTime() + 600000));
    await expect(d.service.enable('u1', '123456')).rejects.toBeInstanceOf(MfaInvalidCodeError);
    await d.service.setup('u1', 'password');
    d.state.passwordHash = 'hash:new-password';
    await expect(d.service.enable('u1', '123456')).rejects.toBeInstanceOf(MfaInvalidCodeError);
    expect(d.state.enabled).toBe(false);
  });
  it('requires factor only for enabled users and rejects activation step replay', async () => {
    const d = setup();
    await d.service.verifyLogin('u1');
    await d.enroll();
    await expect(d.service.verifyLogin('u1')).rejects.toBeInstanceOf(MfaRequiredError);
    expect(d.failures).toBe(0);
    await expect(d.service.verifyLogin('u1', '123456')).rejects.toBeInstanceOf(MfaInvalidCodeError);
    d.clock.set(new Date(d.clock.now().getTime() + 30000));
    await d.service.verifyLogin('u1', '123456');
    expect(d.failures).toBe(0);
    await expect(d.service.verifyLogin('u1', '123456')).rejects.toBeInstanceOf(MfaInvalidCodeError);
  });
  it('allows only one of concurrent TOTP and recovery submissions', async () => {
    const d = setup();
    const { recoveryCodes } = await d.enroll();
    d.clock.set(new Date(d.clock.now().getTime() + 30000));
    const results = await Promise.allSettled([
      d.service.verifyLogin('u1', '123456'),
      d.service.verifyLogin('u1', '123456'),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const recoveries = await Promise.allSettled([
      d.service.verifyLogin('u1', recoveryCodes[0]),
      d.service.verifyLogin('u1', recoveryCodes[0]),
    ]);
    expect(recoveries.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(d.codes.size).toBe(9);
  });
  it('blocks on fifth failure', async () => {
    const d = setup();
    await d.enroll();
    for (let i = 0; i < 4; i++)
      await expect(d.service.verifyLogin('u1', '654321')).rejects.toBeInstanceOf(
        MfaInvalidCodeError
      );
    await expect(d.service.verifyLogin('u1', '654321')).rejects.toBeInstanceOf(RateLimitedError);
    await expect(d.service.verifyLogin('u1', '123456')).rejects.toBeInstanceOf(RateLimitedError);
    expect(d.failures).toBe(5);
  });
  it('records the login only after the second factor and never the submitted code', async () => {
    const d = setup();
    await d.service.verifyLogin('u1');
    await d.enroll();
    d.clock.set(new Date(d.clock.now().getTime() + 30000));
    d.audit.events.length = 0;

    await expect(d.service.verifyLogin('u1')).rejects.toBeInstanceOf(MfaRequiredError);
    for (let i = 0; i < 5; i++) await d.service.verifyLogin('u1', '654321').catch(() => undefined);
    await expect(d.service.verifyLogin('u1', '123456')).rejects.toBeInstanceOf(RateLimitedError);

    expect(d.audit.events.map(({ event, reason }) => `${event}:${reason}`)).toEqual([
      'auth.login.failure:mfa_required',
      ...Array(5).fill('auth.login.failure:mfa_invalid_code'),
      'auth.login.locked:mfa_too_many_failures',
      'rate_limit.hit:mfa',
    ]);
    expect(d.audit.events.every((event) => event.userId === 'u1')).toBe(true);
    expect(JSON.stringify(d.audit.events)).not.toMatch(/654321|123456/);
  });

  it('records a successful login with and without a second factor', async () => {
    const d = setup();
    await d.service.verifyLogin('u1');
    await d.enroll();
    d.clock.set(new Date(d.clock.now().getTime() + 30000));
    await d.service.verifyLogin('u1', '123456');

    expect(d.audit.events).toEqual([
      { event: 'auth.login.success', outcome: 'success', userId: 'u1', reason: undefined },
      { event: 'auth.login.success', outcome: 'success', userId: 'u1', reason: 'mfa' },
    ]);
  });

  it('checks only selected recovery hash and consumes it before disabling', async () => {
    const d = setup();
    const { recoveryCodes } = await d.enroll();
    const before = d.verificationCalls;
    await d.service.verifyLogin('u1', recoveryCodes[0]);
    expect(d.verificationCalls - before).toBe(1);
    await expect(d.service.disable('u1', 'wrong', recoveryCodes[1])).rejects.toBeInstanceOf(
      AuthenticationError
    );
    expect(d.codes.size).toBe(9);
    await d.service.disable('u1', 'password', recoveryCodes[1]);
    expect(d.state.enabled).toBe(false);
    expect(d.codes.size).toBe(0);
    expect(d.failures).toBe(0);
  });
  it('rejects password races at compare and swap boundaries', async () => {
    const d = setup();
    await d.service.setup('u1', 'password');
    const activate = d.repo.activate;
    d.repo.activate = async (...args) => {
      d.state.passwordHash = 'hash:changed';
      return activate(...args);
    };
    await expect(d.service.enable('u1', '123456')).rejects.toBeInstanceOf(MfaInvalidCodeError);
    const e = setup();
    const { recoveryCodes } = await e.enroll();
    await expect(
      e.service.verifyLogin('u1', recoveryCodes[0], 'hash:stale')
    ).rejects.toBeInstanceOf(AuthenticationError);
    expect(e.codes.size).toBe(10);
    const disable = e.repo.disable;
    e.repo.disable = async (...args) => {
      e.state.passwordHash = 'hash:changed';
      return disable(...args);
    };
    await expect(e.service.disable('u1', 'password', recoveryCodes[0])).rejects.toBeInstanceOf(
      MfaInvalidCodeError
    );
    expect(e.state.enabled).toBe(true);
  });
  it('retries identifier collisions without dropping recovery hashes', async () => {
    const d = setup(['aaaaaaaa', 'bbbbbbbb', 'cccccccc', 'aaaaaaaa']);
    const result = await d.enroll();
    expect(result.recoveryCodes[0]).toBe('aaaaaaaa-bbbbbbbb-cccccccc');
    expect(result.recoveryCodes).toHaveLength(10);
    expect(new Set(result.recoveryCodes.map((code) => code.slice(0, 8))).size).toBe(10);
    expect(d.codes.size).toBe(10);
  });
  it('rejects OAuth-only setup through a dummy password check and records failure', async () => {
    const d = setup();
    d.state.passwordHash = '';
    await expect(d.service.setup('u1', 'password')).rejects.toBeInstanceOf(AuthenticationError);
    expect(d.dummyVerifications).toBe(1);
    expect(d.failures).toBe(1);
    expect(d.state.pendingSecretEnc).toBeNull();
  });
  it('rejects a password replacement between verification and staging', async () => {
    const d = setup();
    const stage = d.repo.stage;
    d.repo.stage = async (...args) => {
      d.state.passwordHash = 'hash:changed';
      return stage(...args);
    };
    await expect(d.service.setup('u1', 'password')).rejects.toBeInstanceOf(AuthenticationError);
    expect(d.state.pendingSecretEnc).toBeNull();
  });
  it('returns the validated version snapshot for session creation', async () => {
    const d = setup();
    d.state.sessionVersion = 7;
    expect(await d.service.verifyLogin('u1', undefined, 'hash:password')).toBe(7);
    const { recoveryCodes, sessionVersion } = await d.enroll();
    expect(sessionVersion).toBe(8);
    const consume = d.repo.consumeRecovery;
    d.repo.consumeRecovery = async (...args) => {
      const result = await consume(...args);
      d.state.sessionVersion++;
      return result;
    };
    expect(await d.service.verifyLogin('u1', recoveryCodes[0], 'hash:password')).toBe(8);
    expect(d.state.sessionVersion).toBe(9);
  });
  it('rejects invalid and corrupt pending secrets without enabling a factor', async () => {
    const d = setup();
    await d.service.setup('u1', 'password');
    for (const pending of [
      'corrupt',
      d.cipher.encryptText('not json', 'user:u1:mfa'),
      d.cipher.encryptText('null', 'user:u1:mfa'),
    ]) {
      d.state.pendingSecretEnc = pending;
      await expect(d.service.enable('u1', '123456')).rejects.toBeInstanceOf(MfaInvalidCodeError);
    }
    expect(d.state.enabled).toBe(false);
    expect(d.codes.size).toBe(0);
  });
  it('refuses activation when session version changes during recovery hashing', async () => {
    const d = setup();
    await d.service.setup('u1', 'password');
    const hash = d.passwords.hash;
    let changed = false;
    d.passwords.hash = async (plain) => {
      if (!changed) {
        d.state.sessionVersion++;
        changed = true;
      }
      return hash(plain);
    };
    await expect(d.service.enable('u1', '123456')).rejects.toBeInstanceOf(MfaInvalidCodeError);
    expect(d.state.enabled).toBe(false);
    expect(d.codes.size).toBe(0);
    expect(d.state.sessionVersion).toBe(1);
  });
});
