import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { mfaRecoveryCodes, users } from '@/db/schema';
import { integrationScope } from '@/server/testing/integrationScope';
import { AesGcmCipher } from '../security/AesGcmCipher';
import { HmacBlindIndex } from '../security/HmacBlindIndex';
import { DrizzleUserRepository } from './DrizzleUserRepository';
import { DrizzleMfaRepository } from './DrizzleMfaRepository';
import { DrizzleSessionRepository } from './DrizzleSessionRepository';

const scope = integrationScope();
const cipher = new AesGcmCipher(new Map([[1, randomBytes(32)]]), 1);
const userRepository = new DrizzleUserRepository(db, cipher, new HmacBlindIndex(randomBytes(32)));
const repository = new DrizzleMfaRepository(db);
const sessions = new DrizzleSessionRepository(db);
const now = new Date('2026-10-27T20:00:00Z');
afterAll(() => scope.cleanup());
async function user(label: string) {
  const id = scope.id(label);
  await userRepository.create({
    id,
    name: 'MFA user',
    email: `${id}@bytebank.test`,
    passwordHash: 'hash',
  });
  return id;
}
async function activate(id: string) {
  const pending = cipher.encryptText(
    JSON.stringify({ secret: 'secret', passwordHash: 'hash' }),
    `user:${id}:mfa`
  );
  const secret = cipher.encryptText('secret', `user:${id}:mfa`);
  await repository.stage(id, pending, new Date(now.getTime() + 600000), 'hash');
  expect(
    await repository.activate(
      id,
      pending,
      now,
      100,
      [
        { id: 'aabbccdd', hash: 'recovery-hash' },
        { id: '11223344', hash: 'other-hash' },
      ],
      'hash',
      secret,
      0
    )
  ).toBe(true);
  return { pending, secret };
}
describe('DrizzleMfaRepository', () => {
  it('keeps existing accounts disabled with no factor and handles missing users', async () => {
    const id = await user('defaults');
    expect(await repository.find(id)).toEqual({
      userId: id,
      enabled: false,
      sessionVersion: 0,
      secretEnc: null,
      pendingSecretEnc: null,
      pendingExpiresAt: null,
      lastUsedStep: null,
      passwordHash: 'hash',
      recoveryCodesRemaining: 0,
    });
    expect(await repository.find(scope.id('missing'))).toBeNull();
    expect(await repository.stage(scope.id('missing'), 'pending', now, 'hash')).toBe(false);
  });
  it('atomically activates, revokes sessions and stores encrypted state plus hashes', async () => {
    const id = await user('activate');
    await sessions.create(id, scope.id('sid'), new Date(Date.now() + 600000));
    const { secret, pending } = await activate(id);
    expect(await repository.find(id)).toMatchObject({
      enabled: true,
      secretEnc: secret,
      pendingSecretEnc: null,
      pendingExpiresAt: null,
      lastUsedStep: 100,
      recoveryCodesRemaining: 2,
    });
    expect(await sessions.find(id, scope.id('sid'))).toBeNull();
    const [row] = await db.select().from(users).where(eq(users.id, id));
    expect(row.sessionVersion).toBe(1);
    expect(row.mfaSecretEnc).not.toBe('secret');
    expect(await repository.stage(id, 'replacement', new Date(now.getTime() + 10000), 'hash')).toBe(
      false
    );
    expect(await repository.activate(id, pending, now, 101, [], 'hash', secret, 0)).toBe(false);
    expect(await repository.findRecovery(id, 'aabbccdd')).toBe('recovery-hash');
  });
  it('rejects replaced, expired and password-invalidated pending enrollment', async () => {
    const id = await user('pending');
    const future = new Date(now.getTime() + 600000);
    await repository.stage(id, 'first', future, 'hash');
    await repository.stage(id, 'second', future, 'hash');
    expect(await repository.activate(id, 'first', now, 1, [], 'hash', 'secret', 0)).toBe(false);
    expect(await repository.activate(id, 'second', future, 1, [], 'hash', 'secret', 0)).toBe(false);
    await userRepository.updatePasswordHash(id, 'changed');
    expect(await repository.activate(id, 'second', now, 1, [], 'hash', 'secret', 0)).toBe(false);
    expect(await repository.stage(id, 'third', future, 'hash')).toBe(false);
  });
  it('consumes TOTP steps once under concurrency, rejects older steps and stale factors/passwords', async () => {
    const id = await user('totp');
    const { secret } = await activate(id);
    const results = await Promise.all([
      repository.consumeTotp(id, secret, 101, 'hash'),
      repository.consumeTotp(id, secret, 101, 'hash'),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await repository.consumeTotp(id, secret, 100, 'hash')).toBe(false);
    expect(await repository.consumeTotp(id, 'wrong', 102, 'hash')).toBe(false);
    expect(await repository.consumeTotp(id, secret, 102, 'wrong')).toBe(false);
    expect(await repository.consumeTotp(id, secret, 102, 'hash')).toBe(true);
  });
  it('isolates and consumes recovery hashes atomically', async () => {
    const id = await user('recovery'),
      other = await user('other');
    const { secret } = await activate(id);
    expect(await repository.findRecovery(other, 'aabbccdd')).toBeNull();
    expect(await repository.consumeRecovery(id, 'aabbccdd', 'wrong', secret, 'hash')).toBe(false);
    expect(await repository.consumeRecovery(id, 'aabbccdd', 'recovery-hash', 'stale', 'hash')).toBe(
      false
    );
    const results = await Promise.all([
      repository.consumeRecovery(id, 'aabbccdd', 'recovery-hash', secret, 'hash'),
      repository.consumeRecovery(id, 'aabbccdd', 'recovery-hash', secret, 'hash'),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await repository.findRecovery(id, 'aabbccdd')).toBeNull();
    expect((await repository.find(id))?.recoveryCodesRemaining).toBe(1);
  });
  it('rolls back activation when recovery identifiers collide', async () => {
    const id = await user('collision');
    await repository.stage(id, 'pending', new Date(now.getTime() + 600000), 'hash');
    await expect(
      repository.activate(
        id,
        'pending',
        now,
        1,
        [
          { id: 'same', hash: 'one' },
          { id: 'same', hash: 'two' },
        ],
        'hash',
        'secret',
        0
      )
    ).rejects.toThrow();
    expect(await repository.find(id)).toMatchObject({
      enabled: false,
      pendingSecretEnc: 'pending',
      recoveryCodesRemaining: 0,
    });
    expect((await db.select().from(users).where(eq(users.id, id)))[0].sessionVersion).toBe(0);
  });
  it('disables with CAS, deletes sessions/hashes, increments version and cascades user deletion', async () => {
    const id = await user('disable');
    const { secret } = await activate(id);
    await sessions.create(id, scope.id('new-session'), new Date(Date.now() + 600000));
    expect(await repository.disable(id, 'wrong', 'hash')).toBe(false);
    expect(await repository.disable(id, secret, 'wrong')).toBe(false);
    expect(await repository.disable(id, secret, 'hash')).toBe(true);
    expect(await repository.disable(id, secret, 'hash')).toBe(false);
    expect(await repository.find(id)).toMatchObject({
      enabled: false,
      secretEnc: null,
      lastUsedStep: null,
      recoveryCodesRemaining: 0,
    });
    expect(await sessions.find(id, scope.id('new-session'))).toBeNull();
    expect((await db.select().from(users).where(eq(users.id, id)))[0].sessionVersion).toBe(2);
    const cascade = await user('cascade');
    await activate(cascade);
    await db.delete(users).where(eq(users.id, cascade));
    expect(
      await db
        .select()
        .from(mfaRecoveryCodes)
        .where(and(eq(mfaRecoveryCodes.userId, cascade), eq(mfaRecoveryCodes.id, 'aabbccdd')))
    ).toEqual([]);
  });
  it('rejects activation after session-version revocation without persisting codes', async () => {
    const id = await user('stale-version');
    await repository.stage(id, 'pending', new Date(now.getTime() + 600000), 'hash');
    await sessions.revokeAll(id);
    expect(
      await repository.activate(
        id,
        'pending',
        now,
        1,
        [{ id: 'aabbccdd', hash: 'hash' }],
        'hash',
        'secret',
        0
      )
    ).toBe(false);
    expect(await repository.find(id)).toMatchObject({
      enabled: false,
      sessionVersion: 1,
      pendingSecretEnc: 'pending',
      recoveryCodesRemaining: 0,
    });
  });
});
