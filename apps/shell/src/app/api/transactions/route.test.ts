import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('./store', () => ({ create: mocks.create }));

import { POST } from './route';

const USER_ID = 'user-123';
const payload = {
  userId: 'joana',
  category: 'Alimentação',
  type: 'withdrawal',
  amount: 42,
  date: '2026-06-23',
  description: 'Mercado',
};

function postRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe('POST /api/transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: USER_ID } });
    mocks.create.mockResolvedValue({ id: 'tx-1', ...payload, userId: USER_ID });
  });

  it('retorna 401 e não cria transação sem sessão', async () => {
    mocks.auth.mockResolvedValue(null);

    const res = await POST(postRequest(payload));

    expect(res.status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('usa o id da sessão em vez do userId informado pelo cliente', async () => {
    const res = await POST(postRequest(payload));

    expect(res.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({ ...payload, userId: USER_ID });
  });
});
