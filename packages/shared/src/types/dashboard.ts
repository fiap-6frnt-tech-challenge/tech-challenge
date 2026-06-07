import type { BalancePoint, CategoryAggregate, MonthlyAggregate } from '../lib/transactions';

export interface DashboardSummary {
  balance: number;
  incomeMonth: number;
  expenseMonth: number;
  savingsMonth: number;
  deltaIncome: number;
  deltaExpense: number;
  byMonth: MonthlyAggregate[];
  balanceOverTime: BalancePoint[];
  byCategory: CategoryAggregate[];
}
