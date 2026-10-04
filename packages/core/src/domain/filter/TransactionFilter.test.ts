import { describe, expect, it } from 'vitest';

import { fromSearchParams, normalizeTransactionFilter, toSearchParams } from './TransactionFilter';

describe('transaction filter codec', () => {
  it('normalizes empty and trimmed filters to one canonical shape', () => {
    expect(normalizeTransactionFilter({ q: '  Uber  ', category: ['transport'] })).toMatchObject({
      type: 'all',
      q: 'Uber',
      category: ['transport'],
      sortBy: 'date',
      sortOrder: 'desc',
    });
  });

  it('encodes the API pagination, sorting and repeated categories', () => {
    const params = toSearchParams(
      {
        type: 'withdrawal',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        sortBy: 'amount',
        sortOrder: 'asc',
        q: 'mercado',
        category: ['food', 'transport'],
        amount_gte: 10,
        amount_lte: 50,
      },
      { page: 2, perPage: 10 }
    );

    expect(params.get('_page')).toBe('2');
    expect(params.get('_per_page')).toBe('10');
    expect(params.get('_sort')).toBe('amount');
    expect(params.get('date_gte')).toBe('2026-01-01');
    expect(params.get('date_lte')).toBe('2026-01-31');
    expect(params.getAll('category')).toEqual(['food', 'transport']);
    expect(params.get('amount_gte')).toBe('10');
    expect(params.get('amount_lte')).toBe('50');
    expect(params.get('type')).toBe('withdrawal');
    expect(params.get('q')).toBe('mercado');
  });

  it('decodes valid API filters with defaults', () => {
    expect(fromSearchParams(new URLSearchParams('_page=3&_sort=-amount&category=food'))).toEqual({
      filter: {
        type: 'all',
        dateFrom: '',
        dateTo: '',
        sortBy: 'amount',
        sortOrder: 'desc',
        q: '',
        amount_gte: undefined,
        amount_lte: undefined,
        category: ['food'],
      },
      page: { page: 3, perPage: 10 },
    });
  });

  it('rejects invalid or unknown API query fields', () => {
    expect(() => fromSearchParams(new URLSearchParams('_per_page=100000'))).toThrow();
    expect(() => fromSearchParams(new URLSearchParams('userId=other'))).toThrow();
  });

  it('reads legacy browser links without weakening API validation', () => {
    expect(
      fromSearchParams(
        new URLSearchParams('page=2&dateFrom=2026-01-01&sortBy=amount&sortOrder=asc'),
        { allowLegacy: true }
      )
    ).toMatchObject({
      filter: { dateFrom: '2026-01-01', sortBy: 'amount', sortOrder: 'asc' },
      page: { page: 2 },
    });
  });

  it('preserves the existing browser URL names for filters and page', () => {
    const params = toSearchParams(
      { dateFrom: '2026-01-01', sortBy: 'amount', sortOrder: 'asc' },
      { page: 2, perPage: 10 },
      { includeDefaults: false, legacyNames: true }
    );
    expect(params.get('page')).toBe('2');
    expect(params.get('dateFrom')).toBe('2026-01-01');
    expect(params.get('sortBy')).toBe('amount');
    expect(params.get('sortOrder')).toBe('asc');
    expect(params.has('_page')).toBe(false);
    expect(params.has('_sort')).toBe(false);
  });

  it('can omit default pagination from browser URLs', () => {
    const params = toSearchParams({}, { page: 1, perPage: 10 }, { includeDefaults: false });
    expect(params.toString()).toBe('');
  });
});
