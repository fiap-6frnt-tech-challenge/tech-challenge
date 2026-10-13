// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UrlFilterStorage } from '../infrastructure/UrlFilterStorage';
import { TransactionFilters } from '../presentation/components/TransactionFilters/TransactionFilters';
import { useTransactionFilters } from './useTransactionFilters';

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState(null, '', '/transactions');
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

describe('reactive transaction filters', () => {
  it('merges a delayed search into the latest URL filters', () => {
    const storage = new UrlFilterStorage();
    const { result } = renderHook(() => useTransactionFilters(storage));
    act(() => result.current.emitSearch('uber'));
    act(() => result.current.setFilters({ ...result.current.filters, category: ['food'] }));
    act(() => vi.advanceTimersByTime(300));
    expect(new URLSearchParams(window.location.search).get('q')).toBe('uber');
    expect(new URLSearchParams(window.location.search).getAll('category')).toEqual(['food']);
  });

  it('cancels pending search and amount edits when all filters are cleared', () => {
    const storage = new UrlFilterStorage();
    const { result } = renderHook(() => useTransactionFilters(storage));
    act(() => {
      result.current.emitSearch('uber');
      result.current.emitMinAmount(120);
      result.current.emitMaxAmount(500);
    });
    act(() => result.current.clearFilters());
    act(() => vi.advanceTimersByTime(400));
    expect(window.location.search).toBe('');
  });

  it('accepts the same committed search immediately after clearing filters', () => {
    const storage = new UrlFilterStorage();
    const { result } = renderHook(() => useTransactionFilters(storage));
    act(() => result.current.emitSearch('uber'));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.filters.q).toBe('uber');

    act(() => result.current.clearFilters());
    act(() => result.current.emitSearch('uber'));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.filters.q).toBe('uber');
  });

  it('accepts the same committed amount immediately after clearing filters', () => {
    const storage = new UrlFilterStorage();
    const { result } = renderHook(() => useTransactionFilters(storage));
    act(() => result.current.emitMinAmount(120));
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.filters.amount_gte).toBe(120);

    act(() => result.current.clearFilters());
    act(() => result.current.emitMinAmount(120));
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.filters.amount_gte).toBe(120);
  });

  it('restores search and amount filters from the URL without emitting new values', () => {
    window.history.replaceState(null, '', '/transactions?q=mercado&amount_gte=120');
    const storage = new UrlFilterStorage();
    const { result } = renderHook(() => useTransactionFilters(storage));
    expect(result.current.filters.q).toBe('mercado');
    expect(result.current.filters.amount_gte).toBe(120);
    act(() => vi.advanceTimersByTime(500));
    expect(window.location.search).toBe('?q=mercado&amount_gte=120');
  });

  it('marks only emitted searches as URL acknowledgements', () => {
    const storage = new UrlFilterStorage();
    const { result } = renderHook(() => useTransactionFilters(storage));
    act(() => result.current.emitSearch('ab'));
    act(() => result.current.emitSearch('abc'));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.searchEmission).toEqual({ q: 'abc', sequence: 1 });
    act(() => result.current.emitSearch('abcd'));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.searchEmission).toEqual({ q: 'abcd', sequence: 2 });
  });

  it('restores an external URL value after a no-op normalized search emission', () => {
    window.history.replaceState(null, '', '/transactions?q=uber');
    const storage = new UrlFilterStorage();
    function Harness() {
      const filters = useTransactionFilters(storage);
      return (
        <TransactionFilters
          value={filters.filters}
          searchEmission={filters.searchEmission}
          isFilterVisible
          onChange={filters.setFilters}
          onSearchChange={filters.emitSearch}
          onMinChange={filters.emitMinAmount}
          onMaxChange={filters.emitMaxAmount}
          onClear={filters.clearFilters}
        />
      );
    }
    render(<Harness />);
    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: 'uber ' } });
    act(() => vi.advanceTimersByTime(300));
    act(() => storage.write(new URLSearchParams('q=food')));
    expect((search as HTMLInputElement).value).toBe('food');
    act(() => storage.write(new URLSearchParams('q=uber')));
    expect((search as HTMLInputElement).value).toBe('uber');
  });
});
