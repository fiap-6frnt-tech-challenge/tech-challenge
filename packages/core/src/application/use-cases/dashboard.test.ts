import { describe, expect, it } from 'vitest';
import { FakeClock } from '../testing';
import type { TransactionRepository } from '../ports';
import { GetAccountOverview, GetDashboardSummary } from './dashboard';

const repository = {
  overview: async () => ({ balance: 250, recent: [] }),
  monthlyTotals: async () => [
    { month: '2025-03', income: 100, expense: 40 },
    { month: '2025-04', income: 150, expense: 50 },
  ],
  categoryTotals: async () => [{ category: 'food', total: 50 }],
  balanceSeries: async () => [{ date: '2025-04-15', balance: 250 }],
} as unknown as TransactionRepository;

describe('dashboard use cases', () => {
  it('gets account overview with five recent transactions', async () => {
    let limit = 0;
    const transactions = {
      ...repository,
      overview: async (_ownerId: string, recentLimit: number) => {
        limit = recentLimit;
        return { balance: 250, recent: [] };
      },
    } as unknown as TransactionRepository;
    await new GetAccountOverview(transactions).execute({ userId: 'u1' });
    expect(limit).toBe(5);
  });

  it('builds the same dashboard summary values from repository totals', async () => {
    const summary = await new GetDashboardSummary(
      repository,
      new FakeClock(new Date('2025-04-15T12:00:00Z'))
    ).execute({ userId: 'u1' });
    expect(summary).toMatchObject({
      balance: 250,
      incomeMonth: 150,
      expenseMonth: 50,
      savingsMonth: 100,
      deltaIncome: 50,
      deltaExpense: 10,
    });
    expect(summary.byCategory).toEqual([{ category: 'food', total: 50 }]);
    expect(summary.balanceOverTime).toEqual([{ date: '2025-04-15', balance: 250 }]);
  });
});
