import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), overview: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/server/container', () => ({
  container: { getAccountOverview: { execute: mocks.overview } },
}));

import { GET } from './route';

const actor = { userId: 'owner' };
const result = { balance: 500, recent: [{ id: 'tx-1' }] };
const request = () => new Request('http://localhost/api/transactions/overview') as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: actor.userId } });
  mocks.overview.mockResolvedValue(result);
});

describe('GET /api/transactions/overview', () => {
  it('requires authentication', async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(mocks.overview).not.toHaveBeenCalled();
  });

  it('returns the account overview from the use case', async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(result);
    expect(mocks.overview).toHaveBeenCalledWith(actor);
  });
});
