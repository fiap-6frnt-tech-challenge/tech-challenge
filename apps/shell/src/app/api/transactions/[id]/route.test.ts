import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { NotFoundError, ValidationError } from '@bytebank/core';
import { updateTransactionSchema } from '@bytebank/core/schemas';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/server/container', () => ({
  container: {
    getTransaction: { execute: mocks.get },
    updateTransaction: { execute: mocks.update },
    deleteTransaction: { execute: mocks.remove },
  },
}));

import { DELETE, GET, PATCH } from './route';

const actor = { userId: 'owner' };
const tx = { id: 'tx-1', userId: actor.userId, description: 'Mercado' };
const context = { params: Promise.resolve({ id: tx.id }) };
const request = (method: string, body?: string): NextRequest =>
  new Request(`http://localhost/api/transactions/${tx.id}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body,
  }) as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: actor.userId } });
  mocks.get.mockResolvedValue(tx);
  mocks.update.mockResolvedValue({ ...tx, description: 'Novo' });
  mocks.remove.mockResolvedValue(undefined);
});

describe('/api/transactions/[id]', () => {
  it.each([
    ['GET', () => GET(request('GET'), context)],
    ['PATCH', () => PATCH(request('PATCH', JSON.stringify({ description: 'Novo' })), context)],
    ['DELETE', () => DELETE(request('DELETE'), context)],
  ])('returns 401 for %s without calling the use case', async (_method, call) => {
    mocks.auth.mockResolvedValue(null);
    const response = await call();
    expect(response.status).toBe(401);
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('gets only the transaction authorized by the actor', async () => {
    const response = await GET(request('GET'), context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(tx);
    expect(mocks.get).toHaveBeenCalledWith(actor, tx.id);
  });

  it('maps a missing transaction to generic 404', async () => {
    mocks.get.mockRejectedValue(new NotFoundError('Transação'));
    const response = await GET(request('GET'), context);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Não encontrado' });
  });

  it('passes the raw patch to the use case and returns its result', async () => {
    const response = await PATCH(
      request('PATCH', JSON.stringify({ description: ' Novo ' })),
      context
    );
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(actor, tx.id, { description: ' Novo ' });
  });

  it('maps validation errors from the use case to 422', async () => {
    const parsed = updateTransactionSchema.safeParse({ userId: 'intruder' });
    if (parsed.success) throw new Error('test setup');
    mocks.update.mockRejectedValue(new ValidationError(parsed.error.issues));
    const response = await PATCH(request('PATCH', JSON.stringify({ userId: 'intruder' })), context);
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: 'Dados inválidos' });
  });

  it('returns 400 for malformed JSON before calling the use case', async () => {
    const response = await PATCH(request('PATCH', '{'), context);
    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('returns 204 for delete and 404 for a missing transaction', async () => {
    expect((await DELETE(request('DELETE'), context)).status).toBe(204);
    expect(mocks.remove).toHaveBeenCalledWith(actor, tx.id);
    mocks.remove.mockRejectedValue(new NotFoundError('Transação'));
    expect((await DELETE(request('DELETE'), context)).status).toBe(404);
  });
});
