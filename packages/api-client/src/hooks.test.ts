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
  useUpdateTransaction,
} from './hooks';
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
