import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), summary: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/server/container', () => ({
  container: { getTransactionsSummary: { execute: mocks.summary } },
}));

import { GET } from './route';

const actor = { userId: 'owner' };
const summary = {
  balance: 100,
  incomeMonth: 150,
  expenseMonth: 50,
  savingsMonth: 100,
  deltaIncome: 20,
  deltaExpense: 10,
  byMonth: [],
  balanceOverTime: [],
  byCategory: [],
};
const request = (query = '') =>
  new Request(`http://localhost/api/transactions/summary${query}`) as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: actor.userId } });
  mocks.summary.mockResolvedValue(summary);
});

describe('GET /api/transactions/summary', () => {
  it('returns 401 before calling the use case without a session', async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(mocks.summary).not.toHaveBeenCalled();
  });

  it('passes the actor and optional date range to the summary use case', async () => {
    const response = await GET(request('?from=2026-01-01&to=2026-02-28'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(summary);
    expect(mocks.summary).toHaveBeenCalledWith(actor, {
      from: '2026-01-01',
      to: '2026-02-28',
    });
  });

  it('passes an empty range when query params are absent', async () => {
    await GET(request());
    expect(mocks.summary).toHaveBeenCalledWith(actor, { from: undefined, to: undefined });
  });
});
