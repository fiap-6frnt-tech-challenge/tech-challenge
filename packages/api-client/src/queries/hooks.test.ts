import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { domainEvents$ } from '@bytebank/stores';
import type { DomainEvent } from '@bytebank/core';

const mocks = vi.hoisted(() => ({
  useMemo: vi.fn((factory: () => unknown) => factory()),
  useCallback: vi.fn(<T extends (...args: never[]) => unknown>(callback: T): T => callback),
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
    useCallback: mocks.useCallback,
  };
});

vi.mock('@tanstack/react-query', () => ({
  queryOptions: <T>(options: T) => options,
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
  useAccountOverview,
  useCreateTransaction,
  useDeleteAttachment,
  useDashboardSummary,
  useDeleteTransaction,
  usePaginatedTransactions,
  useUploadAttachment,
  useUpdateTransaction,
} from './hooks';
import { TransactionHttpGateway } from '../gateways/TransactionHttpGateway';
import { AttachmentHttpGateway } from '../gateways/AttachmentHttpGateway';
import { attachmentKeys, overviewKeys, summaryKeys, transactionKeys } from '../keys';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useMemo.mockImplementation((factory: () => unknown) => factory());
  mocks.useCallback.mockImplementation(
    <T extends (...args: never[]) => unknown>(callback: T) => callback
  );
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

  it('queryFn delega ao gateway com range e signal', async () => {
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
    const summarySpy = vi
      .spyOn(TransactionHttpGateway.prototype, 'summary')
      .mockResolvedValue(summary);

    useDashboardSummary({ from: '2026-01-01', to: '2026-06-30' });
    const options = mocks.useQuery.mock.calls[0][0];

    const signal = new AbortController().signal;
    await expect(options.queryFn({ signal })).resolves.toEqual(summary);
    expect(summarySpy).toHaveBeenCalledWith({ from: '2026-01-01', to: '2026-06-30' }, { signal });
  });

  it('repassa o select ao TanStack sem alterar a chave de cache', () => {
    const select = vi.fn();

    useDashboardSummary({ from: '2026-01-01', to: '2026-06-30', select });

    const options = mocks.useQuery.mock.calls[0][0];
    expect(options.select).toBe(select);
    expect(options.queryKey).toEqual(summaryKeys.range({ from: '2026-01-01', to: '2026-06-30' }));
  });
});

describe('useAccountOverview', () => {
  it('busca saldo e recentes no endpoint de overview, sem baixar a lista', async () => {
    const overview = { balance: 4679.5, recent: [] };
    const overviewSpy = vi
      .spyOn(TransactionHttpGateway.prototype, 'overview')
      .mockResolvedValue(overview);

    useAccountOverview();
    const options = mocks.useQuery.mock.calls[0][0];

    const signal = new AbortController().signal;
    expect(options.queryKey).toEqual(overviewKeys.all);
    await expect(options.queryFn({ signal })).resolves.toEqual(overview);
    expect(overviewSpy).toHaveBeenCalledWith({ signal });
  });
});

describe('transaction mutations summary invalidation', () => {
  it('useCreateTransaction invalida listas, overview e summary no sucesso', () => {
    useCreateTransaction();
    const options = mocks.useMutation.mock.calls[0][0];

    options.onSuccess();

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: transactionKeys.lists() });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: overviewKeys.all });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: summaryKeys.all });
  });

  it('useUpdateTransaction invalida listas, detalhe, overview e summary no sucesso', () => {
    useUpdateTransaction();
    const options = mocks.useMutation.mock.calls[0][0];

    options.onSuccess({ id: 'tx-1' });

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: transactionKeys.lists() });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: transactionKeys.detail('tx-1'),
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: overviewKeys.all });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: summaryKeys.all });
  });

  it('useDeleteTransaction invalida listas, detalhe, overview e summary no settled', () => {
    useDeleteTransaction();
    const options = mocks.useMutation.mock.calls[0][0];

    options.onSettled(undefined, undefined, 'tx-1');

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: transactionKeys.lists() });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: transactionKeys.detail('tx-1'),
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: overviewKeys.all });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: summaryKeys.all });
  });
});

describe('usePaginatedTransactions', () => {
  const listSpy = vi.spyOn(TransactionHttpGateway.prototype, 'list');

  function lastQueryOptions() {
    return mocks.useQuery.mock.calls.at(-1)![0];
  }

  beforeEach(() => {
    listSpy.mockResolvedValue({ data: [], pages: 1, items: 0 });
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

  it('queryFn delega para o gateway com filtro, paginação e signal', async () => {
    const response = { data: [], pages: 3, items: 25 };
    listSpy.mockResolvedValue(response);

    usePaginatedTransactions({ page: 2, perPage: 3, q: 'uber', category: ['food'] });
    const options = lastQueryOptions();

    const signal = new AbortController().signal;
    await expect(options.queryFn({ signal })).resolves.toBe(response);
    expect(listSpy).toHaveBeenCalledWith(
      {
        sortBy: 'date',
        sortOrder: 'desc',
        q: 'uber',
        category: ['food'],
      },
      { page: 2, perPage: 3 },
      { signal }
    );
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

const transaction = {
  id: 'tx-1',
  userId: 'user-1',
  type: 'withdrawal' as const,
  category: 'food',
  amount: 24,
  date: '2026-10-11',
  description: 'Almoço',
};
const attachment = {
  id: 'att-1',
  url: 'https://blob.example/receipt.pdf',
  name: 'receipt.pdf',
  size: 4,
  mimeType: 'application/pdf',
};

function observeEvents(run: () => void): DomainEvent[] {
  const received: DomainEvent[] = [];
  const subscription = domainEvents$.subscribe((event) => received.push(event));
  try {
    run();
    return received;
  } finally {
    subscription.unsubscribe();
  }
}

describe('mutation domain events', () => {
  it('publishes the created transaction after create succeeds', () => {
    useCreateTransaction();
    const options = mocks.useMutation.mock.calls.at(-1)![0];
    const received = observeEvents(() => options.onSuccess(transaction));
    expect(received).toEqual([{ type: 'transaction.created', version: 1, transaction }]);
  });

  it('publishes the updated transaction after update succeeds', () => {
    useUpdateTransaction();
    const options = mocks.useMutation.mock.calls.at(-1)![0];
    const received = observeEvents(() => options.onSuccess(transaction));
    expect(received).toEqual([{ type: 'transaction.updated', version: 1, transaction }]);
  });

  it('publishes the deleted id only after delete succeeds', () => {
    useDeleteTransaction();
    const options = mocks.useMutation.mock.calls.at(-1)![0];
    const received = observeEvents(() => options.onSuccess(undefined, 'tx-1'));
    expect(received).toEqual([{ type: 'transaction.deleted', version: 1, id: 'tx-1' }]);
  });

  it('publishes the attachment id and transaction id after upload succeeds', () => {
    useUploadAttachment();
    const options = mocks.useMutation.mock.calls.at(-1)![0];
    const file = new File(['%PDF'], 'receipt.pdf', { type: 'application/pdf' });
    const received = observeEvents(() => options.onSuccess(attachment, { id: 'tx-1', file }));
    expect(received).toEqual([
      { type: 'attachment.added', version: 1, transactionId: 'tx-1', attachmentId: 'att-1' },
    ]);
  });

  it('publishes and invalidates when the progress stream completes an upload', () => {
    const attachment = {
      id: 'att-stream',
      url: '/attachments/att-stream',
      name: 'receipt.pdf',
      size: 4,
      mimeType: 'application/pdf',
    };
    const file = new File(['%PDF'], 'receipt.pdf', { type: 'application/pdf' });
    const uploadSpy = vi
      .spyOn(AttachmentHttpGateway.prototype, 'upload$')
      .mockReturnValue(of({ type: 'done', attachment }));
    const { uploadStream } = useUploadAttachment();

    const received = observeEvents(() => uploadStream('tx-1', file).subscribe());

    expect(received).toEqual([
      { type: 'attachment.added', version: 1, transactionId: 'tx-1', attachmentId: 'att-stream' },
    ]);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: attachmentKeys.list('tx-1') });
    uploadSpy.mockRestore();
  });

  it('publishes the attachment id and transaction id after remove succeeds', () => {
    useDeleteAttachment();
    const options = mocks.useMutation.mock.calls.at(-1)![0];
    const received = observeEvents(() =>
      options.onSuccess(undefined, { id: 'tx-1', attachmentId: 'att-1' })
    );
    expect(received).toEqual([
      { type: 'attachment.removed', version: 1, transactionId: 'tx-1', attachmentId: 'att-1' },
    ]);
  });
});
