import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { hash, compare } from 'bcryptjs';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  onConflictDoNothing: vi.fn(),
  returning: vi.fn(),
  eq: vi.fn((column: unknown, value: unknown) => ({ column, value })),
}));

vi.mock('./index', () => ({
  db: {
    query: { users: { findFirst: mocks.findFirst } },
    insert: mocks.insert,
  },
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return { ...actual, eq: mocks.eq };
});

import { createUser, findUserByEmail, verifyCredentials } from './users';

function userRow(overrides: Partial<{ email: string; passwordHash: string }> = {}) {
  return {
    id: 'uuid-1',
    name: 'Ana Souza',
    email: overrides.email ?? 'ana@bytebank.com',
    passwordHash: overrides.passwordHash ?? 'hashed',
    image: null,
    createdAt: new Date(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.insert.mockReturnValue({ values: mocks.values });
  mocks.values.mockReturnValue({ onConflictDoNothing: mocks.onConflictDoNothing });
  mocks.onConflictDoNothing.mockReturnValue({ returning: mocks.returning });
  mocks.returning.mockResolvedValue([userRow()]);
});

describe('createUser', () => {
  it('faz hash não-reversível da senha (texto puro nunca é persistido) mas verificável', async () => {
    await createUser({ name: 'Ana Souza', email: 'ana@bytebank.com', password: 'segredo123' });

    const inserted = mocks.values.mock.calls[0][0] as { passwordHash: string };

    expect(inserted.passwordHash).not.toBe('segredo123');
    expect(inserted.passwordHash).not.toContain('segredo123');
    await expect(compare('segredo123', inserted.passwordHash)).resolves.toBe(true);
    await expect(compare('senhaErrada', inserted.passwordHash)).resolves.toBe(false);
  });

  it('normaliza o e-mail para lowercase antes de inserir', async () => {
    await createUser({ name: 'Ana Souza', email: 'ANA@ByteBank.com', password: 'segredo123' });

    const inserted = mocks.values.mock.calls[0][0] as { email: string };
    expect(inserted.email).toBe('ana@bytebank.com');
  });

  it('retorna a linha inserida', async () => {
    const row = userRow();
    mocks.returning.mockResolvedValue([row]);

    await expect(
      createUser({ name: 'Ana Souza', email: 'ana@bytebank.com', password: 'segredo123' })
    ).resolves.toBe(row);
  });

  it('retorna undefined quando o insert vira no-op por conflito de e-mail', async () => {
    mocks.returning.mockResolvedValue([]);

    await expect(
      createUser({ name: 'Ana Souza', email: 'ana@bytebank.com', password: 'segredo123' })
    ).resolves.toBeUndefined();
  });
});

describe('findUserByEmail', () => {
  it('busca pelo e-mail normalizado em lowercase', async () => {
    mocks.findFirst.mockResolvedValue(userRow());

    await findUserByEmail('ANA@ByteBank.com');

    expect(mocks.findFirst).toHaveBeenCalledTimes(1);
    expect(mocks.eq).toHaveBeenCalledWith(expect.anything(), 'ana@bytebank.com');
  });
});

describe('verifyCredentials', () => {
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hash('segredo123', 10);
  });

  it('retorna o usuário quando a senha confere', async () => {
    const row = userRow({ passwordHash });
    mocks.findFirst.mockResolvedValue(row);

    await expect(verifyCredentials('ana@bytebank.com', 'segredo123')).resolves.toBe(row);
  });

  it('rejeita (retorna null) quando a senha está errada', async () => {
    mocks.findFirst.mockResolvedValue(userRow({ passwordHash }));

    await expect(verifyCredentials('ana@bytebank.com', 'senhaErrada')).resolves.toBeNull();
  });

  it('retorna null quando o usuário não existe', async () => {
    mocks.findFirst.mockResolvedValue(undefined);

    await expect(verifyCredentials('ninguem@bytebank.com', 'segredo123')).resolves.toBeNull();
  });
});
