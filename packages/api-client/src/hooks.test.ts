import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useMemo: vi.fn((factory: () => unknown) => factory()),
  useQuery: vi.fn(),
  useMutation: vi.fn((options) => options),
  invalidateQueries: vi.fn(),
  cancelQueries: vi.fn(),
  getQueriesData: vi.fn(() => []),
  setQueriesData: vi.fn(),
  setQueryData: vi.fn(),
}));

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useMemo: mocks.useMemo,
  };
});

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
    cancelQueries: mocks.cancelQueries,
    getQueriesData: mocks.getQueriesData,
    setQueriesData: mocks.setQueriesData,
    setQueryData: mocks.setQueryData,
  }),
}));

import {
  useCreateTransaction,
  useDashboardSummary,
  useDeleteTransaction,
  usePaginatedTransactions,
  useUpdateTransaction,
} from './hooks';
import { TransactionService } from './http';
import { summaryKeys, transactionKeys } from './keys';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useMemo.mockImplementation((factory: () => unknown) => factory());
  mocks.useMutation.mockImplementation((options) => options);
  mocks.getQueriesData.mockReturnValue([]);
});

describe('useDashboardSummary', () => {
  it('configura query com range explícito e staleTime de 60s', () => {
    useDashboardSummary({ from: '2026-01-01', to: '2026-06-30' });

    const options = mocks.useQuery.mock.calls[0][0];
    expect(options.queryKey).toEqual(summaryKeys.range({ from: '2026-01-01', to: '2026-06-30' }));
    expect(options.staleTime).toBe(60_000);
    expect(typeof options.queryFn).toBe('function');
  });

  it('usa range padrão estável de 6 meses quando range não é informado', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));

    useDashboardSummary();

    const options = mocks.useQuery.mock.calls[0][0];
    expect(options.queryKey).toEqual(summaryKeys.range({ from: '2026-01-01', to: '2026-06-15' }));

    vi.useRealTimers();
  });

  it('queryFn busca o summary via fetch (com o range efetivo) e retorna o shape', async () => {
    const summary = {
      balance: 1000,
      incomeMonth: 2000,
      expenseMonth: 1000,
      savingsMonth: 1000,
      deltaIncome: 100,
      deltaExpense: -50,
      byMonth: [],
      balanceOverTime: [],
      byCategory: [],
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => summary });
    vi.stubGlobal('fetch', fetchMock);

    useDashboardSummary({ from: '2026-01-01', to: '2026-06-30' });
    const options = mocks.useQuery.mock.calls[0][0];

    await expect(options.queryFn()).resolves.toEqual(summary);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/transactions/summary?from=2026-01-01&to=2026-06-30'
    );

    vi.unstubAllGlobals();
  });
});

describe('transaction mutations summary invalidation', () => {
  it('useCreateTransaction invalida listas e summary no sucesso', () => {
    useCreateTransaction();
    const options = mocks.useMutation.mock.calls[0][0];

    options.onSuccess();

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: transactionKeys.lists() });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: summaryKeys.all });
  });

  it('useUpdateTransaction invalida listas, detalhe e summary no sucesso', () => {
    useUpdateTransaction();
    const options = mocks.useMutation.mock.calls[0][0];

    options.onSuccess({ id: 'tx-1' });

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: transactionKeys.lists() });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: transactionKeys.detail('tx-1'),
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: summaryKeys.all });
  });

  it('useDeleteTransaction invalida listas, detalhe e summary no settled', () => {
    useDeleteTransaction();
    const options = mocks.useMutation.mock.calls[0][0];

    options.onSettled(undefined, undefined, 'tx-1');

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: transactionKeys.lists() });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: transactionKeys.detail('tx-1'),
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: summaryKeys.all });
  });
});

describe('usePaginatedTransactions', () => {
  const getPaginatedSpy = vi.spyOn(TransactionService, 'getPaginated');

  function lastQueryOptions() {
    return mocks.useQuery.mock.calls.at(-1)![0];
  }

  beforeEach(() => {
    getPaginatedSpy.mockResolvedValue({ data: [], pages: 1, items: 0 });
  });

  it('normaliza defaults (perPage=10, sort -date) na queryKey e expõe queryFn', () => {
    usePaginatedTransactions({ page: 1 });

    const options = lastQueryOptions();
    expect(options.queryKey).toEqual(
      transactionKeys.list({ page: 1, perPage: 10, sortBy: 'date', sortOrder: 'desc' })
    );
    expect(typeof options.queryFn).toBe('function');
    expect(typeof options.placeholderData).toBe('function');
  });

  it('omite type "all" e filtros vazios da queryKey', () => {
    usePaginatedTransactions({ page: 1, type: 'all', q: '', dateFrom: '', dateTo: '' });

    expect(lastQueryOptions().queryKey).toEqual(
      transactionKeys.list({ page: 1, perPage: 10, sortBy: 'date', sortOrder: 'desc' })
    );
  });

  it('inclui os filtros ativos (q, faixa de valor, categorias, type) na queryKey', () => {
    usePaginatedTransactions({
      page: 2,
      perPage: 5,
      type: 'withdrawal',
      q: 'uber',
      amount_gte: 100,
      amount_lte: 500,
      category: ['food', 'transport'],
      sortBy: 'amount',
      sortOrder: 'asc',
      dateFrom: '2026-01-01',
      dateTo: '2026-06-30',
    });

    expect(lastQueryOptions().queryKey).toEqual(
      transactionKeys.list({
        page: 2,
        perPage: 5,
        sortBy: 'amount',
        sortOrder: 'asc',
        type: 'withdrawal',
        dateFrom: '2026-01-01',
        dateTo: '2026-06-30',
        q: 'uber',
        amount_gte: 100,
        amount_lte: 500,
        category: ['food', 'transport'],
      })
    );
  });

  it('queryFn delega para TransactionService.getPaginated com os params normalizados', async () => {
    const response = { data: [], pages: 3, items: 25 };
    getPaginatedSpy.mockResolvedValue(response);

    usePaginatedTransactions({ page: 2, perPage: 3, q: 'uber', category: ['food'] });
    const options = lastQueryOptions();

    await expect(options.queryFn()).resolves.toBe(response);
    expect(getPaginatedSpy).toHaveBeenCalledWith({
      page: 2,
      perPage: 3,
      sortBy: 'date',
      sortOrder: 'desc',
      q: 'uber',
      category: ['food'],
    });
  });

  it('mantém a queryKey estável para os mesmos filtros e a altera ao mudar a página', () => {
    usePaginatedTransactions({ page: 1, q: 'uber' });
    const first = lastQueryOptions().queryKey;

    usePaginatedTransactions({ page: 1, q: 'uber' });
    const same = lastQueryOptions().queryKey;
    expect(same).toEqual(first);

    usePaginatedTransactions({ page: 2, q: 'uber' });
    const next = lastQueryOptions().queryKey;
    expect(next).not.toEqual(first);
  });

  it('placeholderData reaproveita os dados anteriores (sem flicker ao paginar)', () => {
    usePaginatedTransactions({ page: 1 });
    const prev = { data: [], pages: 3, items: 25 };

    expect(lastQueryOptions().placeholderData(prev)).toBe(prev);
  });
});
