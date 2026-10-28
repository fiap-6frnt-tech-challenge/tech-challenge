import { describe, expect, it } from 'vitest';
import { FakeClock, SequentialIdGenerator } from '../testing';
import { SessionLifecycle, RevokeSessions } from './sessions';
import type { SessionRepository } from '../ports';

class MemorySessions implements SessionRepository {
  version: number | null = 0;
  reads = 0;
  active = new Map<string, Date>();
  async create(_userId: string, sid: string, expiresAt: Date, expectedVersion?: number) {
    if (
      this.version === null ||
      (expectedVersion !== undefined && expectedVersion !== this.version)
    )
      return null;
    this.active.set(sid, expiresAt);
    return this.version;
  }
  async find(_userId: string, sid: string) {
    this.reads++;
    const expiresAt = this.active.get(sid);
    return expiresAt && this.version !== null ? { version: this.version, expiresAt } : null;
  }
  async revokeCurrent(_userId: string, sid: string) {
    this.active.delete(sid);
  }
  async revokeAll() {
    if (this.version === null) return false;
    this.version++;
    return true;
  }
}
function setup() {
  const clock = new FakeClock(new Date('2026-10-18T12:00:00Z'));
  const repository = new MemorySessions();
  const lifecycle = new SessionLifecycle(repository, clock, new SequentialIdGenerator('session'));
  const advance = (ms: number) => clock.set(new Date(clock.now().getTime() + ms));
  return { clock, repository, lifecycle, advance };
}

describe('server session lifecycle', () => {
  it('starts an independent session and never extends its absolute 12h lifetime', async () => {
    const { lifecycle, advance } = setup();
    const token = await lifecycle.start('user');
    expect(token).toMatchObject({ userId: 'user', sid: 'session-1', sv: 0 });
    advance(12 * 60 * 60 * 1000 - 1);
    expect((await lifecycle.validate(token))?.authTime).toBe(token?.authTime);
    advance(1);
    expect(await lifecycle.validate(token)).toBeNull();
  });
  it('rechecks the server at 5min and rejects a copied token after global revocation', async () => {
    const { lifecycle, repository, advance } = setup();
    const token = await lifecycle.start('user');
    await new RevokeSessions(repository).execute({ userId: 'user' });
    advance(299_999);
    expect(await lifecycle.validate(token)).not.toBeNull();
    expect(repository.reads).toBe(0);
    advance(1);
    expect(await lifecycle.validate(token)).toBeNull();
  });
  it('revokes only the current session and leaves another device valid', async () => {
    const { lifecycle, advance } = setup();
    const first = await lifecycle.start('user');
    const second = await lifecycle.start('user');
    await lifecycle.revokeCurrent(first);
    advance(300_000);
    expect(await lifecycle.validate(first)).toBeNull();
    expect(await lifecycle.validate(second)).not.toBeNull();
  });
  it('rejects deleted users and does not mint sessions for unknown identities', async () => {
    const { lifecycle, repository, advance } = setup();
    const token = await lifecycle.start('user');
    repository.version = null;
    expect(await lifecycle.start('user')).toBeNull();
    advance(300_000);
    expect(await lifecycle.validate(token)).toBeNull();
  });
  it.each([null, {}, { userId: 'user' }, { userId: 'user', authTime: Infinity }])(
    'rejects legacy/malformed claims: %j',
    async (claims) => {
      expect(await setup().lifecycle.validate(claims)).toBeNull();
    }
  );
  it('rejects future timestamps and refuses missing actors during revocation', async () => {
    const { lifecycle, repository } = setup();
    const token = await lifecycle.start('user');
    expect(await lifecycle.validate({ ...token, authTime: token!.authTime + 1 })).toBeNull();
    expect(await lifecycle.validate({ ...token, svCheckedAt: token!.svCheckedAt + 1 })).toBeNull();
    await expect(new RevokeSessions(repository).execute({ userId: '' })).rejects.toThrow();
  });
});

it('rejects an authentication proof if MFA/session version changed before session creation', async () => {
  const { lifecycle, repository } = setup();
  repository.version = 1;
  expect(await lifecycle.start('user', 0)).toBeNull();
  expect(repository.active.size).toBe(0);
  expect(await lifecycle.start('user', 1)).toMatchObject({ sv: 1 });
});
