import { Money, type DashboardSummary } from '../../domain';
import type { Actor, Clock, TransactionRepository } from '../ports';
import type { AccountOverview, DateRange } from '../types';

function difference(minuend: number, subtrahend: number): number {
  return Money.fromDecimal(minuend).subtract(Money.fromDecimal(subtrahend)).toDecimal();
}

export class GetAccountOverview {
  constructor(private readonly transactions: TransactionRepository) {}
  execute(actor: Actor): Promise<AccountOverview> {
    return this.transactions.overview(actor.userId, 5);
  }
}

export class GetDashboardSummary {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly clock: Clock
  ) {}
  async execute(actor: Actor): Promise<DashboardSummary> {
    const today = this.clock.todayISO();
    const month = today.slice(0, 7);
    const [year, monthNumber] = month.split('-').map(Number);
    const fromDate = new Date(Date.UTC(year, monthNumber - 12, 1));
    const range: DateRange = { from: fromDate.toISOString().slice(0, 10), to: today };
    const [overview, byMonth, byCategory, balanceOverTime] = await Promise.all([
      this.transactions.overview(actor.userId, 5),
      this.transactions.monthlyTotals(actor.userId, range),
      this.transactions.categoryTotals(actor.userId, range),
      this.transactions.balanceSeries(actor.userId, range),
    ]);
    const previousMonthDate = new Date(Date.UTC(year, monthNumber - 2, 1));
    const previousMonthKey = previousMonthDate.toISOString().slice(0, 7);
    const currentMonth = byMonth.find((entry) => entry.month === month);
    const previousMonth = byMonth.find((entry) => entry.month === previousMonthKey);
    const incomeMonth = currentMonth?.income ?? 0;
    const expenseMonth = currentMonth?.expense ?? 0;
    return {
      balance: overview.balance,
      incomeMonth,
      expenseMonth,
      savingsMonth: difference(incomeMonth, expenseMonth),
      deltaIncome: difference(incomeMonth, previousMonth?.income ?? 0),
      deltaExpense: difference(expenseMonth, previousMonth?.expense ?? 0),
      byMonth,
      balanceOverTime,
      byCategory,
    };
  }
}

/** Preserves the public Phase 2 summary contract while routes migrate to use cases. */
export class GetTransactionsSummary {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(actor: Actor, range: Partial<DateRange> = {}): Promise<DashboardSummary> {
    const [byMonth, byCategory, balanceOverTime] = await Promise.all([
      this.transactions.monthlyTotals(actor.userId, range),
      this.transactions.categoryTotals(actor.userId, range),
      this.transactions.balanceSeries(actor.userId, range),
    ]);
    const current = byMonth.at(-1);
    const previous = byMonth.at(-2);
    const incomeMonth = current?.income ?? 0;
    const expenseMonth = current?.expense ?? 0;
    return {
      balance: balanceOverTime.at(-1)?.balance ?? 0,
      incomeMonth,
      expenseMonth,
      savingsMonth: difference(incomeMonth, expenseMonth),
      deltaIncome: difference(incomeMonth, previous?.income ?? 0),
      deltaExpense: difference(expenseMonth, previous?.expense ?? 0),
      byMonth,
      balanceOverTime,
      byCategory,
    };
  }
}
