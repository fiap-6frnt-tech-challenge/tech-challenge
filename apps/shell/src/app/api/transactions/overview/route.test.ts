import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), overview: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/server/container', () => ({
  container: { getAccountOverview: { execute: mocks.overview } },
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
const request = () => new Request('http://localhost/api/transactions/overview') as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: actor.userId } });
  mocks.overview.mockResolvedValue(overview);
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
});
