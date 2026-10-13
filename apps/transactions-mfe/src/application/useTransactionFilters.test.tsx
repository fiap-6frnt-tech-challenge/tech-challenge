// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UrlFilterStorage } from '../infrastructure/UrlFilterStorage';
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

  it('restores search and amount filters from the URL without emitting new values', () => {
    window.history.replaceState(null, '', '/transactions?q=mercado&amount_gte=120');
    const storage = new UrlFilterStorage();
    const { result } = renderHook(() => useTransactionFilters(storage));
    expect(result.current.filters.q).toBe('mercado');
    expect(result.current.filters.amount_gte).toBe(120);
    act(() => vi.advanceTimersByTime(500));
    expect(window.location.search).toBe('?q=mercado&amount_gte=120');
  });
});
