import { describe, expect, it } from 'vitest';
import { ConflictError } from '../../domain';
import type { PasswordHasher, UserRepository } from '../ports';
import { SequentialIdGenerator } from '../testing';
import type { User } from '../types';
import { AuthenticateUser, RegisterUser } from './users';

function setup(existing: User | null = null) {
  let stored = existing;
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
  };
  return {
    users,
    passwords,
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
      new SequentialIdGenerator('user')
    ).execute({ name: ' Ana ', email: 'ANA@example.com', password: 'password123' });
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
    const register = new RegisterUser(deps.users, deps.passwords, new SequentialIdGenerator());
    await expect(
      register.execute({ name: 'Ana', email: 'ANA@example.com', password: 'password123' })
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(register.execute({ email: 'invalid', password: 'x' })).rejects.toHaveProperty(
      'issues'
    );
  });

  it('authenticates valid credentials and returns null for either failure', async () => {
    const deps = setup();
    const user = await new RegisterUser(
      deps.users,
      deps.passwords,
      new SequentialIdGenerator()
    ).execute({ name: 'Ana', email: 'ana@example.com', password: 'password123' });
    const authenticate = new AuthenticateUser(deps.users, deps.passwords);
    await expect(authenticate.execute('ANA@example.com', 'password123')).resolves.toEqual(user);
    await expect(authenticate.execute('missing@example.com', 'password123')).resolves.toBeNull();
    await expect(authenticate.execute('ana@example.com', 'wrong-password')).resolves.toBeNull();
  });
});
