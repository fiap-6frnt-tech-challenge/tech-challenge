import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  attachmentKeys,
  normalizeTransactionsPageParams,
  resolveSummaryRange,
  summaryKeys,
  transactionKeys,
} from './keys';

afterEach(() => {
  vi.useRealTimers();
});

describe('normalizeTransactionsPageParams', () => {
  it('fills the list defaults and drops empty filters', () => {
    expect(
      normalizeTransactionsPageParams({
        page: 2,
        type: 'all',
        q: '',
        dateFrom: '',
        dateTo: '',
        category: [],
      })
    ).toEqual({ page: 2, perPage: 10, sortBy: 'date', sortOrder: 'desc' });
  });

  it('keeps every active filter', () => {
    expect(
      normalizeTransactionsPageParams({
        page: 1,
        perPage: 5,
        type: 'withdrawal',
        q: 'uber',
        amount_gte: 0,
        category: ['transport'],
      })
    ).toEqual({
      page: 1,
      perPage: 5,
      sortBy: 'date',
      sortOrder: 'desc',
      type: 'withdrawal',
      q: 'uber',
      amount_gte: 0,
      category: ['transport'],
    });
  });
});

describe('resolveSummaryRange', () => {
  it('keeps an explicit range', () => {
    expect(resolveSummaryRange({ from: '2026-01-01', to: '2026-06-30' })).toEqual({
      from: '2026-01-01',
      to: '2026-06-30',
    });
  });

  it('defaults to the São Paulo calendar, so server (UTC) and browser build the same key', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-16T01:30:00.000Z'));

    expect(resolveSummaryRange()).toEqual({ from: '2026-01-01', to: '2026-06-15' });
  });
});

describe('transactionKeys', () => {
  it('monta chaves hierárquicas consistentes', () => {
    expect(transactionKeys.all).toEqual(['transactions']);
    expect(transactionKeys.lists()).toEqual(['transactions', 'list']);
    expect(transactionKeys.list({ page: 1 })).toEqual(['transactions', 'list', { page: 1 }]);
    expect(transactionKeys.details()).toEqual(['transactions', 'detail']);
    expect(transactionKeys.detail('abc')).toEqual(['transactions', 'detail', 'abc']);
  });

  it('list() é prefixado por lists() (permite invalidação por escopo)', () => {
    const list = transactionKeys.list({ type: 'deposit' });
    const lists = transactionKeys.lists();
    expect(list.slice(0, lists.length)).toEqual([...lists]);
  });
});

describe('summaryKeys', () => {
  it('monta chaves de summary por range', () => {
    const range = { from: '2026-01-01', to: '2026-06-30' };

    expect(summaryKeys.all).toEqual(['summary']);
    expect(summaryKeys.range(range)).toEqual(['summary', { from: '2026-01-01', to: '2026-06-30' }]);
  });

  it('range() é prefixado por all (permite invalidação por escopo)', () => {
    const key = summaryKeys.range({ from: '2026-01-01' });

    expect(key.slice(0, summaryKeys.all.length)).toEqual([...summaryKeys.all]);
  });
});

describe('attachmentKeys', () => {
  it('monta chave de anexos sob o detalhe da transação', () => {
    expect(attachmentKeys.list('tx-1')).toEqual(['transactions', 'detail', 'tx-1', 'attachments']);

    expect(attachmentKeys.list('tx-1').slice(0, transactionKeys.detail('tx-1').length)).toEqual(
      transactionKeys.detail('tx-1')
    );
  });
});
