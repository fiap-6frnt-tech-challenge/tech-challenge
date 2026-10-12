import { categoryLabel } from '../category/categories';
import { Money } from '../money/Money';
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
  const totals = new Map<string, Money>();
  for (const { category, total } of categories) {
    const label = categoryLabel(category);
    totals.set(label, (totals.get(label) ?? Money.zero()).add(Money.fromDecimal(total)));
  }

  const othersLabel = categoryLabel('other');
  const others = totals.get(othersLabel) ?? Money.zero();
  totals.delete(othersLabel);

  const ranked = [...totals].sort(([, a], [, b]) => b.cents - a.cents);
  const rest = ranked.slice(5).reduce((sum, [, total]) => sum.add(total), others);
  const slices = ranked.slice(0, 5).map(([label, total]) => ({ label, value: total.toDecimal() }));
  if (rest.cents > 0) slices.push({ label: othersLabel, value: rest.toDecimal() });
  return slices;
}
