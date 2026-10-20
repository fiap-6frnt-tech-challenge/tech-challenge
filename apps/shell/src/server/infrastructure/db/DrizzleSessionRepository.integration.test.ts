import { randomBytes } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { integrationScope } from '@/server/testing/integrationScope';
import { AesGcmCipher } from '../security/AesGcmCipher';
import { HmacBlindIndex } from '../security/HmacBlindIndex';
import { DrizzleUserRepository } from './DrizzleUserRepository';
import { DrizzleSessionRepository } from './DrizzleSessionRepository';

const scope = integrationScope();
const sessions = new DrizzleSessionRepository(db);
const users = new DrizzleUserRepository(
  db,
  new AesGcmCipher(new Map([[1, randomBytes(32)]]), 1),
  new HmacBlindIndex(randomBytes(32))
);
afterAll(() => scope.cleanup());
async function createUser(label: string) {
  const id = scope.id(label);
  await users.create({
    id,
    name: 'Session user',
    email: `${id}@bytebank.test`,
    passwordHash: 'hash',
  });
  return id;
}
describe('persistent sessions', () => {
  it('revokes one session without affecting another and isolates owners', async () => {
    const owner = await createUser('owner');
    const other = await createUser('other');
    const expires = new Date(Date.now() + 43_200_000);
    expect(await sessions.create(owner, scope.id('a'), expires)).toBe(0);
    await sessions.create(owner, scope.id('b'), expires);
    await sessions.revokeCurrent(other, scope.id('a'));
    expect(await sessions.find(owner, scope.id('a'))).not.toBeNull();
    await sessions.revokeCurrent(owner, scope.id('a'));
    expect(await sessions.find(owner, scope.id('a'))).toBeNull();
    expect(await sessions.find(owner, scope.id('b'))).toMatchObject({ version: 0 });
  });
  it('increments versions atomically and password replacement invalidates previous versions', async () => {
    const owner = await createUser('version');
    const sid = scope.id('old');
    const expires = new Date(Date.now() + 43_200_000);
    await sessions.create(owner, sid, expires);
    await Promise.all([sessions.revokeAll(owner), sessions.revokeAll(owner)]);
    expect(await sessions.find(owner, sid)).toMatchObject({ version: 2 });
    await users.updatePasswordHash(owner, 'replacement');
    expect(await sessions.find(owner, sid)).toMatchObject({ version: 3 });
    expect(await sessions.create(owner, scope.id('new'), expires)).toBe(3);
  });
  it('does not create sessions for nonexistent users', async () => {
    expect(await sessions.create(scope.id('missing'), scope.id('sid'), new Date())).toBeNull();
    expect(await sessions.revokeAll(scope.id('missing'))).toBe(false);
  });
});
