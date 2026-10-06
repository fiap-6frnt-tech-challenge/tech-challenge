import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { ConflictError, ValidationError } from '@bytebank/core';
import { registerSchema } from '@bytebank/core/schemas';

const mocks = vi.hoisted(() => ({ register: vi.fn(), auth: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/server/container', () => ({
  container: { registerUser: { execute: mocks.register } },
}));

import { POST } from './route';

const input = { name: 'Ana Souza', email: 'ana@bytebank.com', password: 'segredo123' };
const user = { id: 'user-1', name: input.name, email: input.email, passwordHash: 'secret-hash' };
const request = (body: string) =>
  new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }) as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.register.mockResolvedValue(user);
});

describe('POST /api/auth/register', () => {
  it('is public and returns only id, name and email with 201', async () => {
    const response = await POST(request(JSON.stringify(input)));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
    });
    expect(mocks.register).toHaveBeenCalledWith(input);
  });

  it('maps an existing email to the Phase 2 conflict message', async () => {
    mocks.register.mockRejectedValue(new ConflictError('E-mail'));
    const response = await POST(request(JSON.stringify(input)));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: 'E-mail já cadastrado' });
  });

  it('returns flattened 422 issues for invalid registration', async () => {
    const invalid = { ...input, password: '123' };
    const parsed = registerSchema.safeParse(invalid);
    if (parsed.success) throw new Error('test setup');
    mocks.register.mockRejectedValue(new ValidationError(parsed.error.issues));
    const response = await POST(request(JSON.stringify(invalid)));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      issues: { fieldErrors: { password: expect.any(Array) } },
    });
  });

  it('returns 400 for malformed JSON before registration', async () => {
    const response = await POST(request('{'));
    expect(response.status).toBe(400);
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it('returns 413 for JSON above 16 KB', async () => {
    const response = await POST(request(JSON.stringify({ ...input, name: 'x'.repeat(17000) })));
    expect(response.status).toBe(413);
    expect(mocks.register).not.toHaveBeenCalled();
  });
});
