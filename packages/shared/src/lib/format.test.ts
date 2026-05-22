import { describe, expect, it } from 'vitest';

import { formatCurrency, formatCurrencyExact, formatDate } from '..';

function normalizeCurrencySpaces(value: string): string {
  return value.replace(/\u00a0/g, ' ');
}

describe('format utilities', () => {
  it('formats BRL currency with and without abbreviated suffixes', () => {
    expect(normalizeCurrencySpaces(formatCurrency(1234.56))).toBe('R$ 1.234,56');
    expect(formatCurrency(1500, true)).toBe('R$ 1,5 mil');
    expect(formatCurrency(-2_000_000, true)).toBe('-R$ 2 mi');
  });

  it('formats exact BRL currency', () => {
    expect(normalizeCurrencySpaces(formatCurrencyExact(42))).toBe('R$ 42,00');
  });

  it('formats ISO date strings in pt-BR using local midnight', () => {
    expect(formatDate('2026-05-21')).toBe('21/05/2026');
  });
});
