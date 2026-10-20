import { describe, expect, it } from 'vitest';
import { ValidationError } from '../errors';
import { parseTransactionQuery } from './parseTransactionQuery';

describe('framework-free transaction query validation', () => {
  it('coerces numbers, trims search and preserves defaults', () => {
    expect(
      parseTransactionQuery({
        _page: '2',
        _per_page: '100',
        q: '  Uber  ',
        amount_gte: '',
        category: ['food', 'food'],
      })
    ).toEqual({
      _page: 2,
      _per_page: 100,
      _sort: '-date',
      q: 'Uber',
      category: ['food', 'food'],
      amount_gte: 0,
    });
  });
  it('accepts leap-day dates and all supported sort/type values', () => {
    expect(
      parseTransactionQuery({
        date_gte: '2024-02-29',
        date_lte: '2026-12-31',
        _sort: 'amount',
        type: 'transfer',
      })
    ).toMatchObject({
      date_gte: '2024-02-29',
      date_lte: '2026-12-31',
      _sort: 'amount',
      type: 'transfer',
    });
  });
  it.each([
    null,
    [],
    'query',
    { unknown: 'x' },
    { _page: '0' },
    { _page: '1.5' },
    { _page: 'Infinity' },
    { _per_page: '101' },
    { _sort: 'userId' },
    { type: 'all' },
    { date_gte: '2026-02-29' },
    { date_lte: '2024-04-31' },
    { date_gte: '2026-1-01' },
    { q: null },
    { q: 'x'.repeat(101) },
    { q: 'bad\0query' },
    { category: 'food' },
    { category: ['unknown'] },
    { category: Array(21).fill('food') },
    { amount_gte: '-1' },
    { amount_lte: 'NaN' },
    { amount_lte: 'Infinity' },
  ])('rejects invalid input %j with domain validation issues', (input) => {
    expect(() => parseTransactionQuery(input)).toThrow(ValidationError);
  });
  it('retains field paths for the HTTP 422 adapter', () => {
    try {
      parseTransactionQuery({ _page: 0, category: ['bad'] });
      throw new Error('must reject');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ['_page'] }),
          expect.objectContaining({ path: ['category'] }),
        ])
      );
    }
  });
});
