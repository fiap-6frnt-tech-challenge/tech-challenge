// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { invalidateClientSession } from '@bytebank/stores';
import type { DashboardSummary, Transaction } from '@bytebank/core';
import type { AccountOverview } from '@bytebank/core/application';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransactionHttpGateway } from '../gateways/TransactionHttpGateway';
import { overviewKeys, summaryKeys, transactionKeys } from '../keys';
import { useCreateTransaction, useUpdateTransaction } from './hooks';

const range = { from: '2026-05-01', to: '2026-10-24' };
const existing: Transaction = {
  id: 'tx-1',
  userId: 'user-1',
  type: 'deposit',
  category: 'salary',
  amount: 1000,
  date: '2026-10-01',
  description: 'Salário',
};
const overview: AccountOverview = { balance: 1000, recent: [existing] };
const summary: DashboardSummary = {
  balance: 1000,
  incomeMonth: 1000,
  expenseMonth: 0,
  savingsMonth: 1000,
  deltaIncome: 1000,
  deltaExpense: 0,
  byMonth: [{ month: '2026-10', income: 1000, expense: 0 }],
  balanceOverTime: [{ date: '2026-10-01', balance: 1000 }],
  byCategory: [],
};
const listKey = transactionKeys.list({ page: 1 });
const input = {
  type: 'withdrawal' as const,
  category: 'food',
  amount: 24.5,
  date: '2026-10-20',
  description: 'Almoço',
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function setup({ withOverview = true } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  if (withOverview) queryClient.setQueryData(overviewKeys.all, overview);
  queryClient.setQueryData(summaryKeys.range(range), summary);
  queryClient.setQueryData(listKey, { data: [existing], pages: 1, items: 1 });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const views = () => ({
    overview: queryClient.getQueryData<AccountOverview>(overviewKeys.all),
    summary: queryClient.getQueryData<DashboardSummary>(summaryKeys.range(range)),
    list: queryClient.getQueryData(listKey),
  });
  const invalidated = (key: readonly unknown[]) => queryClient.getQueryState(key)?.isInvalidated;
  return { queryClient, wrapper, views, invalidated };
}

describe('optimistic create', () => {
  it('updates balance, recent and summary before the server answers, then invalidates', async () => {
    const server = deferred<Transaction>();
    vi.spyOn(TransactionHttpGateway.prototype, 'create').mockReturnValue(server.promise);
    const { wrapper, views, invalidated } = setup();
    const { result } = renderHook(() => useCreateTransaction(), { wrapper });

    let outcome!: Promise<unknown>;
    act(() => {
      outcome = result.current.mutateAsync(input);
    });

    await waitFor(() => expect(views().overview?.balance).toBe(975.5));
    expect(views().overview?.recent[0]).toMatchObject({
      ...input,
      id: expect.stringMatching(/^optimistic-/),
    });
    expect(views().summary).toMatchObject({ balance: 975.5, expenseMonth: 24.5 });
    expect(views().list).toEqual({ data: [existing], pages: 1, items: 1 });

    await act(async () => {
      server.resolve({ ...input, id: 'tx-2', userId: 'user-1' });
      await outcome;
    });
    expect(invalidated(overviewKeys.all)).toBe(true);
    expect(invalidated(summaryKeys.range(range))).toBe(true);
    expect(invalidated(listKey)).toBe(true);
  });

  it('rolls back overview and summary when the server fails', async () => {
    const server = deferred<Transaction>();
    vi.spyOn(TransactionHttpGateway.prototype, 'create').mockReturnValue(server.promise);
    const { wrapper, views, invalidated } = setup();
    const { result } = renderHook(() => useCreateTransaction(), { wrapper });

    let outcome!: Promise<unknown>;
    act(() => {
      outcome = result.current.mutateAsync(input).catch((error: unknown) => error);
    });
    await waitFor(() => expect(views().overview?.balance).toBe(975.5));

    let error: unknown;
    await act(async () => {
      server.reject(new Error('API fora'));
      error = await outcome;
    });

    expect(error).toMatchObject({ message: 'API fora' });
    expect(views().overview).toEqual(overview);
    expect(views().summary).toEqual(summary);
    expect(invalidated(overviewKeys.all)).toBe(true);
  });

  it('does not restore the snapshot after the session is cleared', async () => {
    const server = deferred<Transaction>();
    vi.spyOn(TransactionHttpGateway.prototype, 'create').mockReturnValue(server.promise);
    const { queryClient, wrapper, views } = setup();
    const { result } = renderHook(() => useCreateTransaction(), { wrapper });

    let outcome!: Promise<unknown>;
    act(() => {
      outcome = result.current.mutateAsync(input).catch((error: unknown) => error);
    });
    await waitFor(() => expect(views().overview?.balance).toBe(975.5));
    invalidateClientSession();
    queryClient.clear();

    let error: unknown;
    await act(async () => {
      server.reject(new Error('Late create failure'));
      error = await outcome;
    });

    expect(error).toMatchObject({ name: 'ClientSessionEndedError' });
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
  });
});

describe('optimistic update', () => {
  const edited = { ...existing, amount: 1200 };

  it('applies the difference to overview and summary, then rolls back on failure', async () => {
    const server = deferred<Transaction>();
    vi.spyOn(TransactionHttpGateway.prototype, 'update').mockReturnValue(server.promise);
    const { wrapper, views, invalidated } = setup();
    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    let outcome!: Promise<unknown>;
    act(() => {
      outcome = result.current
        .mutateAsync({ id: 'tx-1', data: { amount: 1200 } })
        .catch((error: unknown) => error);
    });

    await waitFor(() => expect(views().overview?.balance).toBe(1200));
    expect(views().overview?.recent).toEqual([edited]);
    expect(views().summary).toMatchObject({ balance: 1200, incomeMonth: 1200 });
    expect(views().list).toEqual({ data: [existing], pages: 1, items: 1 });

    await act(async () => {
      server.reject(new Error('API fora'));
      await outcome;
    });
    expect(views().overview).toEqual(overview);
    expect(views().summary).toEqual(summary);
    expect(invalidated(listKey)).toBe(true);
  });

  it('finds the previous version in the list cache when the overview is not loaded', async () => {
    const server = deferred<Transaction>();
    vi.spyOn(TransactionHttpGateway.prototype, 'update').mockReturnValue(server.promise);
    const { wrapper, views } = setup({ withOverview: false });
    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    let outcome!: Promise<unknown>;
    act(() => {
      outcome = result.current.mutateAsync({ id: 'tx-1', data: { amount: 1200 } });
    });

    await waitFor(() => expect(views().summary?.balance).toBe(1200));
    await act(async () => {
      server.resolve(edited);
      await outcome;
    });
  });

  it('only invalidates when the transaction is not cached', async () => {
    const server = deferred<Transaction>();
    vi.spyOn(TransactionHttpGateway.prototype, 'update').mockReturnValue(server.promise);
    const { wrapper, views, invalidated } = setup();
    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    let outcome!: Promise<unknown>;
    act(() => {
      outcome = result.current.mutateAsync({ id: 'unknown', data: { amount: 5 } });
    });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(views().overview).toEqual(overview);
    expect(views().summary).toEqual(summary);

    await act(async () => {
      server.resolve({ ...existing, id: 'unknown', amount: 5 });
      await outcome;
    });
    expect(invalidated(overviewKeys.all)).toBe(true);
    expect(invalidated(summaryKeys.range(range))).toBe(true);
  });
});
