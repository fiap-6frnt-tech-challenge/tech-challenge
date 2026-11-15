// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { fromBrowserSearchParams } from '@bytebank/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '../client';
import { TransactionHttpGateway } from '../gateways/TransactionHttpGateway';
import { usePrefetchNextTransactionsPage, useTransactionsPage } from './hooks';
import { transactionsPageQuery } from './queryOptions';

const SETTLE_MS = 1000;
const page = (n: number) => ({ data: [], pages: 3, items: 25, page: n });
const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'connection');
});

function setup() {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('usePrefetchNextTransactionsPage', () => {
  it('deixa a página n + 1 no cache com a mesma chave que a lista vai usar', async () => {
    const list = vi
      .spyOn(TransactionHttpGateway.prototype, 'list')
      .mockImplementation(async (_filter, { page: n }) => page(n));
    const { wrapper } = setup();
    const filters = { type: 'withdrawal' as const, q: 'uber', category: [] };

    renderHook(() => usePrefetchNextTransactionsPage({ page: 1, ...filters }, 3), { wrapper });
    await wait(SETTLE_MS);
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    expect(list).toHaveBeenCalledWith(
      { sortBy: 'date', sortOrder: 'desc', type: 'withdrawal', q: 'uber' },
      { page: 2, perPage: 10 },
      expect.anything()
    );

    const { result } = renderHook(() => useTransactionsPage({ page: 2, ...filters }), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(page(2));
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('só pré-busca depois que a página atual fica estável', async () => {
    const list = vi.spyOn(TransactionHttpGateway.prototype, 'list').mockResolvedValue(page(2));
    const { wrapper } = setup();

    renderHook(() => usePrefetchNextTransactionsPage({ page: 1 }, 3), { wrapper });
    await wait(SETTLE_MS - 1);
    expect(list).not.toHaveBeenCalled();

    await wait(1);
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
  });

  it('não pré-busca a página 2 dos termos intermediários da busca', async () => {
    const list = vi
      .spyOn(TransactionHttpGateway.prototype, 'list')
      .mockImplementation(async (_filter, { page: n }) => page(n));
    const { wrapper } = setup();
    const { rerender } = renderHook<void, { q: string; pages?: number }>(
      ({ q, pages }) => usePrefetchNextTransactionsPage({ page: 1, q, category: [] }, pages),
      { wrapper, initialProps: { q: 'su', pages: 3 } }
    );

    for (const q of ['sup', 'supe', 'super']) {
      await wait(400);
      rerender({ q, pages: undefined });
      await wait(100);
      rerender({ q, pages: 3 });
    }
    expect(list).not.toHaveBeenCalled();

    await wait(SETTLE_MS);
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    expect(list).toHaveBeenCalledWith(
      { sortBy: 'date', sortOrder: 'desc', q: 'super' },
      { page: 2, perPage: 10 },
      expect.anything()
    );
  });

  it('não busca além da última página nem sem o total confirmado', async () => {
    const list = vi.spyOn(TransactionHttpGateway.prototype, 'list').mockResolvedValue(page(1));
    const { wrapper } = setup();

    renderHook(() => usePrefetchNextTransactionsPage({ page: 3 }, 3), { wrapper });
    renderHook(() => usePrefetchNextTransactionsPage({ page: 1 }, undefined), { wrapper });

    await wait(SETTLE_MS);
    expect(list).not.toHaveBeenCalled();
  });

  it('respeita a Economia de dados', async () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    });
    const list = vi.spyOn(TransactionHttpGateway.prototype, 'list').mockResolvedValue(page(2));
    const { wrapper } = setup();

    renderHook(() => usePrefetchNextTransactionsPage({ page: 1 }, 3), { wrapper });

    await wait(SETTLE_MS);
    expect(list).not.toHaveBeenCalled();
  });
});

describe('transactionsPageQuery', () => {
  it('gera a mesma chave para /transactions sem filtros e para o estado inicial da URL', () => {
    const { filter, page: initialPage } = fromBrowserSearchParams(new URLSearchParams());

    expect(transactionsPageQuery({ page: 1 }).queryKey).toEqual(
      transactionsPageQuery({ page: initialPage, ...filter }).queryKey
    );
  });
});
