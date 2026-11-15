import { computeKpiDeltas, topCategoriesWithOthers } from '@bytebank/core';
import type {
  BalancePoint,
  CategorySlice,
  DashboardSummary,
  MonthlyAggregate,
} from '@bytebank/core';

export interface KpiViewModel {
  value: number;
  delta: number | undefined;
}

export interface DashboardViewModel {
  income: KpiViewModel;
  expense: KpiViewModel;
  savings: KpiViewModel;
  byMonth: MonthlyAggregate[];
  byCategory: CategorySlice[];
  balanceOverTime: BalancePoint[];
}

export const EMPTY_DASHBOARD_VIEW_MODEL: DashboardViewModel = {
  income: { value: 0, delta: undefined },
  expense: { value: 0, delta: undefined },
  savings: { value: 0, delta: undefined },
  byMonth: [],
  byCategory: [],
  balanceOverTime: [],
};

export function toDashboardViewModel(summary: DashboardSummary): DashboardViewModel {
  const deltas = computeKpiDeltas(summary);

  return {
    income: { value: summary.incomeMonth, delta: deltas.income },
    expense: {
      value: summary.expenseMonth,
      delta: deltas.expense !== undefined ? -deltas.expense : undefined,
    },
    savings: { value: summary.savingsMonth, delta: deltas.savings },
    byMonth: summary.byMonth,
    byCategory: topCategoriesWithOthers(summary.byCategory),
    balanceOverTime: summary.balanceOverTime,
  };
}
