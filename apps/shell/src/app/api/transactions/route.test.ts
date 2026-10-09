import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ValidationError } from '@bytebank/core';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
}));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/server/container', () => ({
  container: {
    createTransaction: { execute: mocks.create },
    listTransactions: { execute: mocks.list },
  },
}));

import { GET, POST } from './route';

const actor = { userId: 'user-123' };
const payload = {
  category: 'food',
  type: 'withdrawal',
  amount: 42,
  date: '2026-06-23',
  description: 'Mercado',
};
const tx = { id: 'tx-1', userId: actor.userId, ...payload };

function getRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/transactions${query}`);
}
function postRequest(body: string): NextRequest {
  return new Request('http://localhost/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }) as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: actor.userId } });
  mocks.create.mockResolvedValue(tx);
  mocks.list.mockResolvedValue({ items: [tx], page: 1, perPage: 10, total: 1, totalPages: 1 });
});

describe('GET /api/transactions', () => {
  it('returns 401 before calling a use case without a session', async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('paginates with the default page when _page is omitted', async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [tx], pages: 1, items: 1 });
    expect(mocks.list).toHaveBeenCalledWith(actor, expect.anything(), { page: 1, perPage: 10 });
  });

  it('rejects pages larger than 100 items', async () => {
    const response = await GET(getRequest('?_page=1&_per_page=101'));
    expect(response.status).toBe(422);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('maps the application page to the Phase 2 response shape', async () => {
    mocks.list.mockResolvedValue({ items: [tx], page: 2, perPage: 3, total: 25, totalPages: 9 });
    const response = await GET(getRequest('?_page=2&_per_page=3&_sort=amount&category=food'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [tx], pages: 9, items: 25 });
    expect(mocks.list).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({ sortBy: 'amount', sortOrder: 'asc', category: ['food'] }),
      { page: 2, perPage: 3 }
    );
  });

  it('rejects invalid query before accessing the repository', async () => {
    const response = await GET(getRequest('?_page=0'));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: 'Dados inválidos' });
    expect(mocks.list).not.toHaveBeenCalled();
  });
});

describe('POST /api/transactions', () => {
  it('returns 201 and passes raw input with the actor from the session', async () => {
    const response = await POST(postRequest(JSON.stringify(payload)));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(tx);
    expect(mocks.create).toHaveBeenCalledWith(actor, payload);
  });

  it('preserves 400 for malformed JSON and does not call the use case', async () => {
    const response = await POST(postRequest('{'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'JSON inválido' });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('preserves 413 for oversized JSON', async () => {
    const response = await POST(
      postRequest(JSON.stringify({ ...payload, description: 'x'.repeat(17000) }))
    );
    expect(response.status).toBe(413);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('maps application validation errors to flattened 422 issues', async () => {
    const result = z.object({ amount: z.number().positive() }).safeParse({ amount: -1 });
    if (result.success) throw new Error('test setup');
    mocks.create.mockRejectedValue(new ValidationError(result.error.issues));
    const response = await POST(postRequest(JSON.stringify({ ...payload, amount: -1 })));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Dados inválidos',
      issues: { fieldErrors: { amount: expect.any(Array) } },
    });
  });
});
