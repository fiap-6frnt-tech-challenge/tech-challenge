// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { domainEvents$ } from '@bytebank/stores';
import type { DomainEvent } from '@bytebank/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransactionHttpGateway } from '../gateways/TransactionHttpGateway';
import { useCreateTransaction } from './hooks';

const input = {
  type: 'withdrawal' as const,
  category: 'food',
  amount: 24,
  date: '2026-10-11',
  description: 'Almoço',
};
const transaction = { ...input, id: 'tx-1', userId: 'user-1' };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderCreateMutation() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useCreateTransaction(), { wrapper });
  return { ...hook, queryClient };
}

describe('real mutation event publication', () => {
  it('emits exactly one event after the server returns a created transaction', async () => {
    vi.spyOn(TransactionHttpGateway.prototype, 'create').mockResolvedValue(transaction);
    const received: DomainEvent[] = [];
    const subscription = domainEvents$.subscribe((event) => received.push(event));
    const { result, queryClient } = renderCreateMutation();
    try {
      await act(async () => {
        await result.current.mutateAsync(input);
      });
      expect(received).toEqual([{ type: 'transaction.created', version: 1, transaction }]);
    } finally {
      subscription.unsubscribe();
      queryClient.clear();
    }
  });

  it('emits nothing when the server rejects the mutation', async () => {
    vi.spyOn(TransactionHttpGateway.prototype, 'create').mockRejectedValue(
      new Error('server unavailable')
    );
    const received: DomainEvent[] = [];
    const subscription = domainEvents$.subscribe((event) => received.push(event));
    const { result, queryClient } = renderCreateMutation();
    try {
      await act(async () => {
        await expect(result.current.mutateAsync(input)).rejects.toThrow('server unavailable');
      });
      expect(received).toEqual([]);
    } finally {
      subscription.unsubscribe();
      queryClient.clear();
    }
  });
});
