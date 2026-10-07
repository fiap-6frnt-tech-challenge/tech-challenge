import { describe, expect, it } from 'vitest';
import type { DashboardSummary } from '@bytebank/core';
import { EMPTY_DASHBOARD_VIEW_MODEL, toDashboardViewModel } from './toDashboardViewModel';

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    balance: 1000,
    incomeMonth: 120,
    expenseMonth: 60,
    savingsMonth: 60,
    deltaIncome: 20,
    deltaExpense: 10,
    byMonth: [{ month: '2026-09', income: 120, expense: 60 }],
    balanceOverTime: [{ date: '2026-09-30', balance: 1000 }],
    byCategory: [],
    ...overrides,
  };
}

describe('toDashboardViewModel', () => {
  it('maps the monthly KPIs with their percentage change and inverts the expense trend', () => {
    const viewModel = toDashboardViewModel(summary());

    expect(viewModel.income).toEqual({ value: 120, delta: 0.2 });
    expect(viewModel.expense).toEqual({ value: 60, delta: -0.2 });
    expect(viewModel.savings).toEqual({ value: 60, delta: 0.2 });
  });

  it('leaves the deltas undefined when the previous month is zero', () => {
    const viewModel = toDashboardViewModel(
      summary({
        incomeMonth: 100,
        expenseMonth: 40,
        savingsMonth: 60,
        deltaIncome: 100,
        deltaExpense: 40,
      })
    );

    expect(viewModel.income.delta).toBeUndefined();
    expect(viewModel.expense.delta).toBeUndefined();
    expect(viewModel.savings.delta).toBeUndefined();
  });

  it('keeps the top 5 categories and groups the rest as Outros', () => {
    const viewModel = toDashboardViewModel(
      summary({
        byCategory: [
          { category: 'Lazer', total: 10 },
          { category: 'Mercado', total: 70 },
          { category: 'Saúde', total: 20 },
          { category: 'Transporte', total: 40 },
          { category: 'Moradia', total: 90 },
          { category: 'Educação', total: 30 },
          { category: 'Outras', total: 5 },
        ],
      })
    );

    expect(viewModel.byCategory).toEqual([
      { label: 'Moradia', value: 90 },
      { label: 'Mercado', value: 70 },
      { label: 'Transporte', value: 40 },
      { label: 'Educação', value: 30 },
      { label: 'Saúde', value: 20 },
      { label: 'Outros', value: 15 },
    ]);
  });

  it('returns empty chart series for an empty summary', () => {
    const viewModel = toDashboardViewModel(
      summary({ byMonth: [], balanceOverTime: [], byCategory: [] })
    );

    expect(viewModel.byCategory).toEqual([]);
    expect(viewModel.byMonth).toEqual([]);
    expect(viewModel.balanceOverTime).toEqual([]);
  });

  it('exposes an empty view-model for the loading and error states', () => {
    expect(EMPTY_DASHBOARD_VIEW_MODEL).toEqual({
      income: { value: 0, delta: undefined },
      expense: { value: 0, delta: undefined },
      savings: { value: 0, delta: undefined },
      byMonth: [],
      byCategory: [],
      balanceOverTime: [],
    });
  });
});
