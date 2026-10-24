import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashKey, type DehydratedState } from '@tanstack/react-query';
import {
  accountOverviewQuery,
  dashboardSummaryQuery,
  transactionsPageQuery,
} from '@bytebank/api-client';
import { fromBrowserSearchParams, fromSearchParams } from '@bytebank/core';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  overview: vi.fn(),
  summary: vi.fn(),
  list: vi.fn(),
}));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/server/container', () => ({
  container: {
    getAccountOverview: { execute: mocks.overview },
    getTransactionsSummary: { execute: mocks.summary },
    listTransactions: { execute: mocks.list },
  },
}));

import { prefetchHome, prefetchTransactions } from './prefetch';

const signedInAs = (userId: string) => mocks.auth.mockResolvedValue({ user: { id: userId } });
const dataByHash = (state: DehydratedState | undefined) =>
  Object.fromEntries((state?.queries ?? []).map((query) => [query.queryHash, query.state.data]));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.overview.mockImplementation(async ({ userId }) => ({ balance: 1, recent: [userId] }));
  mocks.summary.mockImplementation(async ({ userId }) => ({ balance: 2, owner: userId }));
  mocks.list.mockImplementation(async ({ userId }) => ({
    items: [{ id: `${userId}-tx` }],
    page: 1,
    perPage: 10,
    total: 11,
    totalPages: 2,
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('prefetchHome', () => {
  it('prefetches nothing without a session', async () => {
    mocks.auth.mockResolvedValue(null);

    expect(await prefetchHome()).toBeUndefined();
    expect(mocks.overview).not.toHaveBeenCalled();
  });

  it('uses the keys the remotes query, with the São Paulo default range on a UTC server', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-16T01:30:00Z'));
    signedInAs('user-a');

    const state = await prefetchHome();

    expect(mocks.summary).toHaveBeenCalledWith(
      { userId: 'user-a' },
      { from: '2026-01-01', to: '2026-06-15' }
    );
    expect(dataByHash(state)).toEqual({
      [hashKey(accountOverviewQuery().queryKey)]: { balance: 1, recent: ['user-a'] },
      [hashKey(dashboardSummaryQuery().queryKey)]: { balance: 2, owner: 'user-a' },
    });
  });

  it('builds a fresh cache per request, so one user never receives another user data', async () => {
    signedInAs('user-a');
    const forA = await prefetchHome();
    signedInAs('user-b');
    const forB = await prefetchHome();

    expect(JSON.stringify(forA)).not.toContain('user-b');
    expect(JSON.stringify(forB)).not.toContain('user-a');
  });

  it('leaves a failed query out, so the remote fetches it instead of breaking the page', async () => {
    signedInAs('user-a');
    mocks.summary.mockRejectedValue(new Error('db down'));

    const state = await prefetchHome();

    expect(Object.keys(dataByHash(state))).toEqual([hashKey(accountOverviewQuery().queryKey)]);
  });
});

describe('prefetchTransactions', () => {
  const searchParams = {
    type: 'withdrawal',
    q: 'uber',
    category: ['food', 'transport'],
    sortBy: 'amount',
    page: '2',
  };
  const browserSearch =
    'type=withdrawal&q=uber&category=food&category=transport&sortBy=amount&page=2';

  it('caches the page under the key the remote builds from the URL', async () => {
    signedInAs('user-a');
    const { filter, page } = fromBrowserSearchParams(new URLSearchParams(browserSearch));

    const state = await prefetchTransactions(searchParams);

    expect(dataByHash(state)).toEqual({
      [hashKey(transactionsPageQuery({ page, ...filter }).queryKey)]: {
        data: [{ id: 'user-a-tx' }],
        pages: 2,
        items: 11,
      },
    });
  });

  it('asks the use case exactly what the API route would parse from the remote request', async () => {
    signedInAs('user-a');
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ data: [], pages: 0, items: 0 }));
    const { filter, page } = fromBrowserSearchParams(new URLSearchParams(browserSearch));
    await transactionsPageQuery({ page, ...filter }).queryFn!({
      signal: new AbortController().signal,
    } as never);
    const sent = new URL(String(fetch.mock.calls[0][0]), 'http://localhost');
    const parsedByRoute = fromSearchParams(sent.searchParams);

    await prefetchTransactions(searchParams);

    expect(mocks.list).toHaveBeenCalledWith(
      { userId: 'user-a' },
      parsedByRoute.filter,
      parsedByRoute.page
    );
  });

  it('falls back to the first unfiltered page for an invalid URL, like the remote', async () => {
    signedInAs('user-a');

    const state = await prefetchTransactions({ type: 'bogus', page: '-3' });

    expect(Object.keys(dataByHash(state))).toEqual([
      hashKey(transactionsPageQuery({ page: 1 }).queryKey),
    ]);
  });
});
