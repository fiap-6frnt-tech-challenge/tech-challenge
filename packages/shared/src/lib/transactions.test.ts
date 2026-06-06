import { describe, expect, it } from 'vitest';

import {
  aggregateByMonth,
  calculateBalance,
  cumulativeBalance,
  getAll,
  getRecent,
  groupByCategory,
  TRANSACTION_TYPE,
  type Transaction,
} from '..';

const transactions: Transaction[] = [
  {
    id: '2',
    userId: 'joana',
    type: TRANSACTION_TYPE.WITHDRAWAL,
    category: 'Alimentação',
    amount: 25,
    date: '2026-01-02',
    description: 'Withdrawal',
  },
  {
    id: '1',
    userId: 'joana',
    type: TRANSACTION_TYPE.DEPOSIT,
    category: 'Salário',
    amount: 100,
    date: '2026-01-03',
    description: 'Deposit',
  },
  {
    id: '3',
    userId: 'joana',
    type: TRANSACTION_TYPE.TRANSFER,
    category: 'Moradia',
    amount: 40,
    date: '2026-01-01',
    description: 'Transfer',
  },
];

describe('transaction utilities', () => {
  it('calculates balance from deposits and withdrawals while transfers stay neutral', () => {
    expect(calculateBalance(transactions)).toBe(75);
  });

  it('sorts transactions by descending ISO date without mutating the source list', () => {
    const sorted = getAll(transactions);

    expect(sorted.map((transaction) => transaction.id)).toEqual(['1', '2', '3']);
    expect(transactions.map((transaction) => transaction.id)).toEqual(['2', '1', '3']);
  });

  it('returns the most recent transactions respecting the requested limit', () => {
    expect(getRecent(transactions, 2).map((transaction) => transaction.id)).toEqual(['1', '2']);
  });
});

const aggregated: Transaction[] = [
  {
    id: 'a1',
    userId: 'joana',
    type: TRANSACTION_TYPE.DEPOSIT,
    category: 'Salário',
    amount: 5000,
    date: '2026-01-05',
    description: 'Salary',
  },
  {
    id: 'a2',
    userId: 'joana',
    type: TRANSACTION_TYPE.WITHDRAWAL,
    category: 'Alimentação',
    amount: 120,
    date: '2026-01-10',
    description: 'Groceries',
  },
  {
    id: 'a3',
    userId: 'joana',
    type: TRANSACTION_TYPE.WITHDRAWAL,
    category: 'Alimentação',
    amount: 80,
    date: '2026-01-20',
    description: 'Restaurant',
  },
  {
    id: 'a4',
    userId: 'joana',
    type: TRANSACTION_TYPE.WITHDRAWAL,
    category: 'Transporte',
    amount: 50,
    date: '2026-01-22',
    description: 'Fuel',
  },
  {
    id: 'a5',
    userId: 'joana',
    type: TRANSACTION_TYPE.TRANSFER,
    category: 'Moradia',
    amount: 800,
    date: '2026-02-10',
    description: 'Transfer only month',
  },
];

describe('aggregateByMonth', () => {
  it('returns an empty array for no transactions', () => {
    expect(aggregateByMonth([])).toEqual([]);
  });

  it('sums income (deposit) and expense (withdrawal) per month, ignoring transfers', () => {
    expect(aggregateByMonth(aggregated)).toEqual([
      { month: '2026-01', income: 5000, expense: 250 },
      { month: '2026-02', income: 0, expense: 0 },
    ]);
  });

  it('sorts the resulting months in ascending order regardless of input order', () => {
    const reversed = [...aggregated].reverse();
    expect(aggregateByMonth(reversed).map((m) => m.month)).toEqual(['2026-01', '2026-02']);
  });
});

describe('cumulativeBalance', () => {
  it('returns an empty array for no transactions', () => {
    expect(cumulativeBalance([])).toEqual([]);
  });

  it('accumulates the running balance chronologically, treating transfers as neutral', () => {
    expect(cumulativeBalance(aggregated)).toEqual([
      { date: '2026-01-05', balance: 5000 },
      { date: '2026-01-10', balance: 4880 },
      { date: '2026-01-20', balance: 4800 },
      { date: '2026-01-22', balance: 4750 },
      { date: '2026-02-10', balance: 4750 },
    ]);
  });

  it('orders unsorted input chronologically without mutating the source list', () => {
    const reversed = [...aggregated].reverse();
    const points = cumulativeBalance(reversed);

    expect(points.map((p) => p.date)).toEqual([
      '2026-01-05',
      '2026-01-10',
      '2026-01-20',
      '2026-01-22',
      '2026-02-10',
    ]);
    expect(reversed[0].id).toBe('a5');
  });
});

describe('groupByCategory', () => {
  it('returns an empty array for no transactions', () => {
    expect(groupByCategory([])).toEqual([]);
  });

  it('totals only withdrawals per category, sorted by largest total first', () => {
    expect(groupByCategory(aggregated)).toEqual([
      { category: 'Alimentação', total: 200 },
      { category: 'Transporte', total: 50 },
    ]);
  });

  it('ignores deposits and transfers entirely', () => {
    const incomeOnly: Transaction[] = [
      {
        id: 'i1',
        userId: 'joana',
        type: TRANSACTION_TYPE.DEPOSIT,
        category: 'Salário',
        amount: 5000,
        date: '2026-01-05',
        description: 'Salary',
      },
      {
        id: 'i2',
        userId: 'joana',
        type: TRANSACTION_TYPE.TRANSFER,
        category: 'Investimentos',
        amount: 500,
        date: '2026-01-06',
        description: 'Savings',
      },
    ];
    expect(groupByCategory(incomeOnly)).toEqual([]);
  });
});
