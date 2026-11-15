// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { domainEvents$, invalidateClientSession } from '@bytebank/stores';
import type { DomainEvent } from '@bytebank/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransactionHttpGateway } from '../gateways/TransactionHttpGateway';
import { transactionKeys } from '../keys';
import { useCreateTransaction, useDeleteTransaction } from './hooks';

const input = {
  type: 'withdrawal' as const,
  category: 'food',
  amount: 24,
  date: '2026-10-15',
  description: 'Private lunch',
};
const transaction = { ...input, id: 'tx-1', userId: 'user-1' };
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('mutation session boundaries', () => {
  it('does not restore an optimistic deletion snapshot after the session is cleared', async () => {
    let reject!: (error: Error) => void;
    vi.spyOn(TransactionHttpGateway.prototype, 'remove').mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail;
      })
    );
    const { queryClient, wrapper } = setup();
    const key = transactionKeys.list({ page: 1 });
    queryClient.setQueryData(key, { data: [transaction], pages: 1, items: 1 });
    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });
    let outcome!: Promise<unknown>;
    act(() => {
      outcome = result.current.mutateAsync('tx-1').catch((error: unknown) => error);
    });
    await waitFor(() =>
      expect(queryClient.getQueryData<{ data: unknown[] }>(key)?.data).toEqual([])
    );
    invalidateClientSession();
    queryClient.clear();
    let error: unknown;
    await act(async () => {
      reject(new Error('Late delete failure'));
      error = await outcome;
    });
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
    expect(error).toMatchObject({ name: 'ClientSessionEndedError' });
  });

  it.each(['success', 'failure'] as const)(
    'rejects a late create %s as session-ended and emits no domain event',
    async (mode) => {
      let resolve!: (value: typeof transaction) => void;
      let reject!: (error: Error) => void;
      vi.spyOn(TransactionHttpGateway.prototype, 'create').mockReturnValue(
        new Promise((ok, fail) => {
          resolve = ok;
          reject = fail;
        })
      );
      const { queryClient, wrapper } = setup();
      const { result } = renderHook(() => useCreateTransaction(), { wrapper });
      const events: DomainEvent[] = [];
      const subscription = domainEvents$.subscribe((event) => events.push(event));
      try {
        let outcome!: Promise<unknown>;
        act(() => {
          outcome = result.current.mutateAsync(input).catch((error: unknown) => error);
        });
        await waitFor(() => expect(result.current.isPending).toBe(true));
        invalidateClientSession();
        queryClient.clear();
        let error: unknown;
        await act(async () => {
          if (mode === 'success') resolve(transaction);
          else reject(new Error('Late create failure'));
          error = await outcome;
        });
        expect(error).toMatchObject({ name: 'ClientSessionEndedError' });
        expect(events).toEqual([]);
        expect(queryClient.getQueryCache().getAll()).toEqual([]);
      } finally {
        subscription.unsubscribe();
        queryClient.clear();
      }
    }
  );
});
