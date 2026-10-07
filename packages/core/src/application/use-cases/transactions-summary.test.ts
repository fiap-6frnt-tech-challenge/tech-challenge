import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../domain';
import { InMemoryTransactionRepository } from '../testing';
import { GetTransactionsSummary } from './dashboard';

function transaction(
  id: string,
  userId: string,
  overrides: Partial<Transaction> = {}
): Transaction {
  return {
    id,
    userId,
    type: 'withdrawal',
    category: 'food',
    amount: 1,
    date: '2026-01-10',
    description: id,
    ...overrides,
  };
}

describe('GetTransactionsSummary', () => {
  it('preserves Phase 2 summary values and treats transfers as neutral', async () => {
    const rows = [
      transaction('income-jan', 'owner', {
        type: 'deposit',
        category: 'salary',
        amount: 500,
        date: '2026-01-05',
      }),
      transaction('expense-jan', 'owner', { amount: 50, date: '2026-01-10' }),
      transaction('income-feb', 'owner', {
        type: 'deposit',
        category: 'salary',
        amount: 200,
        date: '2026-02-05',
      }),
      transaction('transfer-feb', 'owner', {
        type: 'transfer',
        category: 'transfer',
        amount: 100,
        date: '2026-02-06',
      }),
      transaction('foreign', 'other', { type: 'deposit', amount: 9999 }),
    ];
    const result = await new GetTransactionsSummary(
      new InMemoryTransactionRepository(rows)
    ).execute({ userId: 'owner' });
    expect(result).toEqual({
      balance: 650,
      incomeMonth: 200,
      expenseMonth: 0,
      savingsMonth: 200,
      deltaIncome: -300,
      deltaExpense: -50,
      byMonth: [
        { month: '2026-01', income: 500, expense: 50 },
        { month: '2026-02', income: 200, expense: 0 },
      ],
      balanceOverTime: [
        { date: '2026-01-05', balance: 500 },
        { date: '2026-01-10', balance: 450 },
        { date: '2026-02-05', balance: 650 },
        { date: '2026-02-06', balance: 650 },
      ],
      byCategory: [{ category: 'food', total: 50 }],
    });
  });

  it('subtracts monthly totals in cents, without floating-point noise', async () => {
    const rows = [
      transaction('income-jan', 'owner', { type: 'deposit', amount: 0.3, date: '2026-01-05' }),
      transaction('income-feb', 'owner', { type: 'deposit', amount: 0.1, date: '2026-02-05' }),
      transaction('expense-feb', 'owner', { amount: 0.3, date: '2026-02-10' }),
    ];
    const result = await new GetTransactionsSummary(
      new InMemoryTransactionRepository(rows)
    ).execute({ userId: 'owner' });
    expect(result).toMatchObject({ savingsMonth: -0.2, deltaIncome: -0.2, deltaExpense: 0.3 });
  });

  it('returns the zero summary for an empty range', async () => {
    const rows = [transaction('jan', 'owner', { date: '2026-01-10' })];
    const result = await new GetTransactionsSummary(
      new InMemoryTransactionRepository(rows)
    ).execute({ userId: 'owner' }, { from: '2026-03-01', to: '2026-03-31' });
    expect(result).toEqual({
      balance: 0,
      incomeMonth: 0,
      expenseMonth: 0,
      savingsMonth: 0,
      deltaIncome: 0,
      deltaExpense: 0,
      byMonth: [],
      balanceOverTime: [],
      byCategory: [],
    });
  });
});
