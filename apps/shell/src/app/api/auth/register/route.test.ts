import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db/users', () => ({
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
}));

import { POST } from './route';
import { findUserByEmail, createUser } from '@/db/users';

const mockFindUserByEmail = vi.mocked(findUserByEmail);
const mockCreateUser = vi.mocked(createUser);

const validInput = { name: 'Ana Souza', email: 'ana@bytebank.com', password: 'segredo123' };

function postRequest(body: unknown) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function userRow(overrides: Partial<{ id: string; name: string; email: string }> = {}) {
  return {
    id: overrides.id ?? 'uuid-1',
    name: overrides.name ?? validInput.name,
    email: overrides.email ?? validInput.email,
    passwordHash: 'hashed',
    image: null,
    createdAt: new Date(),
  };
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 201 com { id, name, email } (sem expor passwordHash) num cadastro válido', async () => {
    mockFindUserByEmail.mockResolvedValue(undefined);
    mockCreateUser.mockResolvedValue(userRow());

    const res = await POST(postRequest(validInput));

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      id: 'uuid-1',
      name: validInput.name,
      email: validInput.email,
    });
  });

  it('retorna 409 quando o e-mail já existe (pre-check) e não tenta inserir', async () => {
    mockFindUserByEmail.mockResolvedValue(userRow({ id: 'uuid-existing' }));

    const res = await POST(postRequest(validInput));

    expect(res.status).toBe(409);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('retorna 409 na corrida: pre-check passa mas o insert vira no-op (onConflictDoNothing)', async () => {
    mockFindUserByEmail.mockResolvedValue(undefined);
    mockCreateUser.mockResolvedValue(undefined);

    const res = await POST(postRequest(validInput));

    expect(res.status).toBe(409);
  });

  it('retorna 422 com issues por campo para payload inválido (senha curta)', async () => {
    const res = await POST(postRequest({ ...validInput, password: '123' }));

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.issues.fieldErrors.password).toBeDefined();
    expect(mockFindUserByEmail).not.toHaveBeenCalled();
  });

  it('retorna 422 para JSON malformado', async () => {
    const res = await POST(postRequest('not json'));

    expect(res.status).toBe(422);
  });
});
