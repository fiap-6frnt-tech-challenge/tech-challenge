import { describe, expect, it } from 'vitest';
import { ResolveOAuthUser } from './oauthUser';
import { SequentialIdGenerator } from '../testing';
import type { User, UserRepository } from '../index';

describe('verified OAuth identity', () => {
  it('refuses automatic Google linking to an existing credentials account', async () => {
    const account: User = {
      id: 'planted',
      name: 'Unverified signup',
      email: 'victim@example.com',
      passwordHash: 'attacker-controlled-hash',
    };
    const users: UserRepository = {
      findByEmail: async () => account,
      create: async () => null,
      updatePasswordHash: async () => {
        throw new Error('Must not silently replace a credential');
      },
    };
    const resolve = new ResolveOAuthUser(users, new SequentialIdGenerator('oauth'));
    await expect(
      resolve.execute({ email: 'victim@example.com', name: 'Verified Google user' })
    ).rejects.toThrow();
    expect(account.passwordHash).toBe('attacker-controlled-hash');
  });
  it('creates one local identity and reuses it on the next login', async () => {
    let stored: User | null = null;
    const users: UserRepository = {
      findByEmail: async (email) => (stored?.email === email ? stored : null),
      create: async (user) => (stored = user),
      updatePasswordHash: async () => undefined,
    };
    const resolve = new ResolveOAuthUser(users, new SequentialIdGenerator('oauth'));
    const profile = { email: 'Ana@Example.com', name: 'Ana' };
    expect(await resolve.execute(profile)).toMatchObject({
      id: 'oauth-1',
      email: 'ana@example.com',
      passwordHash: '',
    });
    expect((await resolve.execute(profile))?.id).toBe('oauth-1');
    await expect(resolve.execute({ email: null })).rejects.toThrow();
  });
});
