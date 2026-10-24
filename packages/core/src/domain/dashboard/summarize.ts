import { Money } from '../money/Money';
import type { BalancePoint, CategoryAggregate, MonthlyAggregate } from '../transaction/rules';
import type { DashboardSummary } from './DashboardSummary';

export interface SummarySeries {
  byMonth: MonthlyAggregate[];
  byCategory: CategoryAggregate[];
  balanceOverTime: BalancePoint[];
}

function difference(minuend: number, subtrahend: number): number {
  return Money.fromDecimal(minuend).subtract(Money.fromDecimal(subtrahend)).toDecimal();
}

export function buildDashboardSummary({
  byMonth,
  byCategory,
  balanceOverTime,
}: SummarySeries): DashboardSummary {
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
