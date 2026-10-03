import type { CategoryAggregate } from '../transaction/rules';
import type { DashboardSummary } from './DashboardSummary';

type MonthlyKpis = Pick<
  DashboardSummary,
  'incomeMonth' | 'expenseMonth' | 'deltaIncome' | 'deltaExpense'
>;

export interface KpiDeltas {
  income: number | undefined;
  expense: number | undefined;
  savings: number | undefined;
}

export interface CategorySlice {
  label: string;
  value: number;
}

export function computeKpiDeltas(summary: MonthlyKpis | undefined): KpiDeltas {
  if (!summary) return { income: undefined, expense: undefined, savings: undefined };

  const toPercent = (delta: number, previous: number) =>
    previous > 0 ? delta / previous : undefined;

  const prevIncome = summary.incomeMonth - summary.deltaIncome;
  const prevExpense = summary.expenseMonth - summary.deltaExpense;
  const prevSavings = prevIncome - prevExpense;
  const deltaSavings = summary.deltaIncome - summary.deltaExpense;

  return {
    income: toPercent(summary.deltaIncome, prevIncome),
    expense: toPercent(summary.deltaExpense, prevExpense),
    savings: toPercent(deltaSavings, prevSavings),
  };
}

export function topCategoriesWithOthers(categories: readonly CategoryAggregate[]): CategorySlice[] {
  if (categories.length === 0) return [];
  const sorted = [...categories].sort((a, b) => b.total - a.total);
  const top = sorted.slice(0, 5).map(({ category, total }) => ({ label: category, value: total }));
  const othersTotal = sorted.slice(5).reduce((total, category) => total + category.total, 0);
  if (othersTotal > 0) top.push({ label: 'Outros', value: othersTotal });
  return top;
}
