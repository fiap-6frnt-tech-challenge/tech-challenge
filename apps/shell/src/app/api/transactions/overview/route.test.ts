import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), overview: vi.fn(), version: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/server/container', () => ({
  container: {
    getAccountOverview: { execute: mocks.overview },
    getTransactionsVersion: { execute: mocks.version },
  },
}));

import { GET } from './route';

const actor = { userId: 'owner' };
const overview = {
  balance: 4679.5,
  recent: [
    {
      id: 'tx-1',
      userId: actor.userId,
      type: 'withdrawal',
      category: 'food',
      amount: 320.5,
      date: '2026-01-10',
      description: 'Mercado',
      attachments: [],
    },
  ],
};
const request = (headers: HeadersInit = {}) =>
  new Request('http://localhost/api/transactions/overview', { headers }) as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: actor.userId } });
  mocks.overview.mockResolvedValue(overview);
  mocks.version.mockResolvedValue('2026-01-10 12:00:00.000001:1');
});

describe('GET /api/transactions/overview', () => {
  it('returns 401 before calling the use case without a session', async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(mocks.overview).not.toHaveBeenCalled();
  });

  it('returns the balance and recent transactions of the actor', async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(overview);
    expect(mocks.overview).toHaveBeenCalledWith(actor);
  });

  it('answers 304 to a repeated request while the data version is unchanged', async () => {
    const first = await GET(request());
    expect(first.headers.get('Cache-Control')).toBe('private, no-cache');

    const second = await GET(request({ 'If-None-Match': first.headers.get('ETag')! }));

    expect(second.status).toBe(304);
    expect(mocks.overview).toHaveBeenCalledTimes(1);
    expect(mocks.version).toHaveBeenCalledWith(actor);
  });
});
