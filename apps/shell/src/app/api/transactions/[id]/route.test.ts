import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('../store', () => ({
  getById: mocks.getById,
  update: mocks.update,
  remove: mocks.remove,
}));

import { DELETE, GET, PATCH } from './route';

const USER_A = 'user-a';
const USER_B = 'user-b';
const TX_ID = 'tx-1';

function params(id = TX_ID) {
  return { params: Promise.resolve({ id }) };
}

function getRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/transactions/${TX_ID}`);
}

function patchRequest(body: unknown): NextRequest {
  return new Request(`http://localhost/api/transactions/${TX_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

function deleteRequest(): NextRequest {
  return new Request(`http://localhost/api/transactions/${TX_ID}`, {
    method: 'DELETE',
  }) as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: USER_A } });
  mocks.getById.mockResolvedValue({ id: TX_ID, userId: USER_A });
  mocks.update.mockResolvedValue({ id: TX_ID, userId: USER_A });
  mocks.remove.mockResolvedValue(true);
});

describe('/api/transactions/[id]', () => {
  it.each([
    ['GET', () => GET(getRequest(), params())],
    ['PATCH', () => PATCH(patchRequest({ description: 'updated' }), params())],
    ['DELETE', () => DELETE(deleteRequest(), params())],
  ])('retorna 401 para %s sem sessão', async (_method, invoke) => {
    mocks.auth.mockResolvedValue(null);

    const response = await invoke();

    expect(response.status).toBe(401);
    expect(mocks.getById).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('retorna 404 no GET quando a transação não pertence ao usuário', async () => {
    mocks.getById.mockResolvedValue(null);

    const response = await GET(getRequest(), params());

    expect(response.status).toBe(404);
    expect(mocks.getById).toHaveBeenCalledWith(TX_ID, USER_A);
  });

  it('retorna 404 no PATCH quando a transação não pertence ao usuário', async () => {
    mocks.update.mockResolvedValue(null);

    const response = await PATCH(patchRequest({ description: 'updated' }), params());

    expect(response.status).toBe(404);
    expect(mocks.update).toHaveBeenCalledWith(TX_ID, USER_A, { description: 'updated' });
  });

  it('retorna 404 no DELETE quando a transação não pertence ao usuário', async () => {
    mocks.remove.mockResolvedValue(false);

    const response = await DELETE(deleteRequest(), params());

    expect(response.status).toBe(404);
    expect(mocks.remove).toHaveBeenCalledWith(TX_ID, USER_A);
  });

  it('ignora userId no PATCH e preserva o dono da transação', async () => {
    mocks.update.mockImplementation(async (_id, userId, patch) => ({
      id: TX_ID,
      userId,
      ...patch,
    }));

    const response = await PATCH(
      patchRequest({ description: 'updated', userId: USER_B }),
      params()
    );

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(TX_ID, USER_A, { description: 'updated' });
    await expect(response.json()).resolves.toMatchObject({ userId: USER_A });
  });
});
