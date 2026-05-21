import { describe, expect, it } from 'vitest';

import { calculateBalance, getAll, getRecent, TRANSACTION_TYPE, type Transaction } from '..';

const transactions: Transaction[] = [
  {
    id: '2',
    type: TRANSACTION_TYPE.WITHDRAWAL,
    amount: 25,
    date: '2026-01-02',
    description: 'Withdrawal',
  },
  {
    id: '1',
    type: TRANSACTION_TYPE.DEPOSIT,
    amount: 100,
    date: '2026-01-03',
    description: 'Deposit',
  },
  {
    id: '3',
    type: TRANSACTION_TYPE.TRANSFER,
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
