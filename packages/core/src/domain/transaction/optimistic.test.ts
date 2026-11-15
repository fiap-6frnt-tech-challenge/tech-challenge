import { describe, expect, it } from 'vitest';
import type { DashboardSummary } from '../dashboard/DashboardSummary';
import {
  applyOptimisticCreate,
  applyOptimisticSummaryCreate,
  applyOptimisticSummaryUpdate,
  applyOptimisticUpdate,
  createOptimisticTransaction,
  isOptimisticId,
} from './optimistic';
import type { Transaction } from './Transaction';

function transaction(id: string, overrides: Partial<Transaction> = {}): Transaction {
  return {
    id,
    userId: 'user-1',
    type: 'withdrawal',
    category: 'food',
    amount: 10,
    date: '2026-10-10',
    description: id,
    ...overrides,
  };
}

const range = { from: '2026-05-01', to: '2026-10-24' };

const summary: DashboardSummary = {
  balance: 450,
  incomeMonth: 500,
  expenseMonth: 50,
  savingsMonth: 450,
  deltaIncome: 500,
  deltaExpense: 50,
  byMonth: [{ month: '2026-09', income: 500, expense: 50 }],
  balanceOverTime: [
    { date: '2026-09-05', balance: 500 },
    { date: '2026-09-20', balance: 450 },
  ],
  byCategory: [{ category: 'food', total: 50 }],
};

describe('optimistic ids', () => {
  it('marks the temporary transaction so the UI can tell it apart', () => {
    const created = createOptimisticTransaction(
      { type: 'deposit', category: 'salary', amount: 10, date: '2026-10-10', description: 'x' },
      'abc'
    );
    expect(created.id).toBe('optimistic-abc');
    expect(isOptimisticId(created.id)).toBe(true);
    expect(isOptimisticId('tx-1')).toBe(false);
  });
});

describe('applyOptimisticCreate', () => {
  it('adds deposits and subtracts withdrawals in cents', () => {
    const overview = { balance: 0.1, recent: [] };
    expect(
      applyOptimisticCreate(overview, transaction('a', { type: 'deposit', amount: 0.2 })).balance
    ).toBe(0.3);
    expect(applyOptimisticCreate(overview, transaction('b', { amount: 0.3 })).balance).toBe(-0.2);
  });

  it('keeps transfers balance-neutral but lists them', () => {
    const result = applyOptimisticCreate(
      { balance: 100, recent: [] },
      transaction('t', { type: 'transfer' })
    );
    expect(result.balance).toBe(100);
    expect(result.recent.map((item) => item.id)).toEqual(['t']);
  });

  it('inserts newest first, ahead of the same date, and keeps five', () => {
    const recent = ['2026-10-12', '2026-10-10', '2026-10-08', '2026-10-05', '2026-10-01'].map(
      (date, index) => transaction(`r${index}`, { date })
    );
    const result = applyOptimisticCreate(
      { balance: 0, recent },
      transaction('new', { date: '2026-10-10' })
    );
    expect(result.recent.map((item) => item.id)).toEqual(['r0', 'new', 'r1', 'r2', 'r3']);
  });

  it('changes the balance without listing a transaction older than the five recent', () => {
    const recent = ['2026-10-12', '2026-10-10', '2026-10-08', '2026-10-05', '2026-10-01'].map(
      (date, index) => transaction(`r${index}`, { date })
    );
    const result = applyOptimisticCreate(
      { balance: 100, recent },
      transaction('old', { date: '2026-01-01' })
    );
    expect(result.balance).toBe(90);
    expect(result.recent).toEqual(recent);
  });
});

describe('applyOptimisticUpdate', () => {
  it('replaces the listed item and applies only the balance difference', () => {
    const previous = transaction('a', { amount: 50, date: '2026-10-01' });
    const other = transaction('b', { date: '2026-10-05' });
    const next = { ...previous, type: 'deposit' as const, amount: 20, date: '2026-10-10' };
    const result = applyOptimisticUpdate(
      { balance: 100, recent: [other, previous] },
      previous,
      next
    );
    expect(result.balance).toBe(170);
    expect(result.recent).toEqual([next, other]);
  });

  it('keeps the order of an item whose date did not change', () => {
    const first = transaction('a');
    const previous = transaction('b');
    const next = { ...previous, description: 'edited' };
    const result = applyOptimisticUpdate({ balance: 0, recent: [first, previous] }, previous, next);
    expect(result.recent.map((item) => item.description)).toEqual(['a', 'edited']);
  });

  it('updates the balance of an item outside the recent list', () => {
    const recent = [transaction('a')];
    const previous = transaction('old', { amount: 5, date: '2025-01-01' });
    const result = applyOptimisticUpdate({ balance: 10, recent }, previous, {
      ...previous,
      amount: 8,
    });
    expect(result).toEqual({ balance: 7, recent });
  });
});

describe('applyOptimisticSummaryCreate', () => {
  it('ignores a transaction outside the summary range', () => {
    expect(
      applyOptimisticSummaryCreate(summary, range, transaction('x', { date: '2026-04-30' }))
    ).toBe(summary);
  });

  it('adds a deposit to its month, the balance and the series', () => {
    const result = applyOptimisticSummaryCreate(
      summary,
      range,
      transaction('d', { type: 'deposit', category: 'salary', amount: 100, date: '2026-09-10' })
    );
    expect(result).toMatchObject({
      balance: 550,
      incomeMonth: 600,
      savingsMonth: 550,
      byMonth: [{ month: '2026-09', income: 600, expense: 50 }],
      balanceOverTime: [
        { date: '2026-09-05', balance: 500 },
        { date: '2026-09-10', balance: 600 },
        { date: '2026-09-20', balance: 550 },
      ],
      byCategory: [{ category: 'food', total: 50 }],
    });
  });

  it('opens a new month and category, which become the current KPIs', () => {
    const result = applyOptimisticSummaryCreate(
      summary,
      range,
      transaction('w', { category: 'transport', amount: 80.5, date: '2026-10-02' })
    );
    expect(result).toMatchObject({
      balance: 369.5,
      incomeMonth: 0,
      expenseMonth: 80.5,
      savingsMonth: -80.5,
      deltaIncome: -500,
      deltaExpense: 30.5,
      byMonth: [
        { month: '2026-09', income: 500, expense: 50 },
        { month: '2026-10', income: 0, expense: 80.5 },
      ],
      byCategory: [
        { category: 'transport', total: 80.5 },
        { category: 'food', total: 50 },
      ],
    });
    expect(result.balanceOverTime.at(-1)).toEqual({ date: '2026-10-02', balance: 369.5 });
  });

  it('adds to the point of an existing day instead of creating another', () => {
    const result = applyOptimisticSummaryCreate(
      summary,
      range,
      transaction('same-day', { amount: 30, date: '2026-09-05' })
    );
    expect(result.balanceOverTime).toEqual([
      { date: '2026-09-05', balance: 470 },
      { date: '2026-09-20', balance: 420 },
    ]);
  });

  it('records a transfer as a neutral point', () => {
    const result = applyOptimisticSummaryCreate(
      summary,
      range,
      transaction('t', { type: 'transfer', amount: 999, date: '2026-09-21' })
    );
    expect(result.balance).toBe(450);
    expect(result.byCategory).toEqual(summary.byCategory);
    expect(result.balanceOverTime.at(-1)).toEqual({ date: '2026-09-21', balance: 450 });
  });
});

describe('applyOptimisticSummaryUpdate', () => {
  const previous = transaction('w', { amount: 50, date: '2026-09-20' });

  it('moves the contribution to the new amount, type and category', () => {
    const result = applyOptimisticSummaryUpdate(summary, range, previous, {
      ...previous,
      category: 'transport',
      amount: 20,
    });
    expect(result).toMatchObject({
      balance: 480,
      expenseMonth: 20,
      byMonth: [{ month: '2026-09', income: 500, expense: 20 }],
      balanceOverTime: [
        { date: '2026-09-05', balance: 500 },
        { date: '2026-09-20', balance: 480 },
      ],
      byCategory: [{ category: 'transport', total: 20 }],
    });
  });

  it('removes the contribution when the new date leaves the range', () => {
    const result = applyOptimisticSummaryUpdate(summary, range, previous, {
      ...previous,
      date: '2026-01-01',
    });
    expect(result).toMatchObject({
      balance: 500,
      expenseMonth: 0,
      balanceOverTime: [{ date: '2026-09-05', balance: 500 }],
      byCategory: [],
    });
  });

  it('keeps the old day while it still moves the balance', () => {
    const shared = { ...summary, balanceOverTime: [{ date: '2026-09-20', balance: -50 }] };
    const partial = transaction('w', { amount: 20, date: '2026-09-20' });
    const result = applyOptimisticSummaryUpdate(shared, range, partial, {
      ...partial,
      date: '2026-09-25',
    });
    expect(result.balanceOverTime).toEqual([
      { date: '2026-09-20', balance: -30 },
      { date: '2026-09-25', balance: -50 },
    ]);
  });

  it('adds the contribution when the old date was outside the range', () => {
    const outside = { ...previous, date: '2026-01-01' };
    const result = applyOptimisticSummaryUpdate(summary, range, outside, {
      ...outside,
      date: '2026-10-01',
    });
    expect(result.balance).toBe(400);
    expect(result.byMonth.at(-1)).toEqual({ month: '2026-10', income: 0, expense: 50 });
  });

  it('returns the same summary when neither date is in range', () => {
    const outside = { ...previous, date: '2026-01-01' };
    expect(applyOptimisticSummaryUpdate(summary, range, outside, { ...outside, amount: 1 })).toBe(
      summary
    );
  });
});
