import { describe, expect, it } from 'vitest';

import { computeKpiDeltas, topCategoriesWithOthers } from './kpis';

describe('computeKpiDeltas', () => {
  it('has no deltas before the summary loads', () => {
    expect(computeKpiDeltas(undefined)).toEqual({
      income: undefined,
      expense: undefined,
      savings: undefined,
    });
  });

  it('computes the same percentage changes from previous monthly values', () => {
    expect(
      computeKpiDeltas({
        incomeMonth: 120,
        expenseMonth: 60,
        deltaIncome: 20,
        deltaExpense: 10,
      })
    ).toEqual({ income: 0.2, expense: 0.2, savings: 0.2 });
  });

  it('leaves a delta undefined when its previous value is zero or negative', () => {
    expect(
      computeKpiDeltas({
        incomeMonth: 10,
        expenseMonth: 20,
        deltaIncome: 10,
        deltaExpense: 20,
      })
    ).toEqual({ income: undefined, expense: undefined, savings: undefined });
  });
});

describe('topCategoriesWithOthers', () => {
  it('keeps the five largest categories and groups the rest without mutating input', () => {
    const input = [
      { category: 'C', total: 30 },
      { category: 'A', total: 50 },
      { category: 'F', total: 5 },
      { category: 'B', total: 40 },
      { category: 'E', total: 10 },
      { category: 'D', total: 20 },
    ];

    expect(topCategoriesWithOthers(input)).toEqual([
      { label: 'A', value: 50 },
      { label: 'B', value: 40 },
      { label: 'C', value: 30 },
      { label: 'D', value: 20 },
      { label: 'E', value: 10 },
      { label: 'Outros', value: 5 },
    ]);
    expect(input[0]).toEqual({ category: 'C', total: 30 });
  });

  it('omits an empty Others slice', () => {
    expect(topCategoriesWithOthers([{ category: 'A', total: 10 }])).toEqual([
      { label: 'A', value: 10 },
    ]);
  });

  it('labels the slices with the category name instead of its id', () => {
    expect(
      topCategoriesWithOthers([
        { category: 'housing', total: 1850 },
        { category: 'food', total: 312.47 },
      ])
    ).toEqual([
      { label: 'Moradia', value: 1850 },
      { label: 'Alimentação', value: 312.47 },
    ]);
  });

  it('merges an id and its legacy label into one slice, summing in cents', () => {
    expect(
      topCategoriesWithOthers([
        { category: 'food', total: 0.1 },
        { category: 'Alimentação', total: 0.2 },
      ])
    ).toEqual([{ label: 'Alimentação', value: 0.3 }]);
  });

  it('keeps the other category inside a single Others slice, always last', () => {
    expect(
      topCategoriesWithOthers([
        { category: 'other', total: 500 },
        { category: 'housing', total: 90 },
        { category: 'food', total: 70 },
        { category: 'transport', total: 40 },
        { category: 'education', total: 30 },
        { category: 'health', total: 20 },
        { category: 'leisure', total: 10 },
      ])
    ).toEqual([
      { label: 'Moradia', value: 90 },
      { label: 'Alimentação', value: 70 },
      { label: 'Transporte', value: 40 },
      { label: 'Educação', value: 30 },
      { label: 'Saúde', value: 20 },
      { label: 'Outros', value: 510 },
    ]);
  });

  it('shows the other category as Others when it is the only one', () => {
    expect(topCategoriesWithOthers([{ category: 'other', total: 12.5 }])).toEqual([
      { label: 'Outros', value: 12.5 },
    ]);
  });
});
