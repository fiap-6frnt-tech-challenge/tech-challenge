import type { TransactionFiltersValue } from '../components/TransactionFilters';
import { fromSearchParams, toSearchParams } from '@bytebank/core';
import { DEFAULT_FILTERS } from '../components/TransactionFilters';
import { useCallback, useState } from 'react';

function decodeBrowserSearch(search: string): { filters: TransactionFiltersValue; page: number } {
  try {
    const decoded = fromSearchParams(new URLSearchParams(search), { allowLegacy: true });
    return { filters: decoded.filter, page: decoded.page.page };
  } catch {
    return { filters: DEFAULT_FILTERS, page: 1 };
  }
}

function currentSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

export function useTransactionFilters() {
  const [search, setSearch] = useState<string>(() => currentSearch());

  const { filters, page } = decodeBrowserSearch(search);

  const applyParams = useCallback((next: URLSearchParams) => {
    const query = next.toString();
    const url = query ? `?${query}` : window.location.pathname;
    window.history.replaceState(window.history.state, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
    setSearch(query ? `?${query}` : '');
  }, []);

  const setFilters = useCallback(
    (next: TransactionFiltersValue) => {
      // Filter changes always reset to page 1 (page param omitted)
      applyParams(
        toSearchParams(
          next,
          { page: 1, perPage: 10 },
          { includeDefaults: false, legacyNames: true }
        )
      );
    },
    [applyParams]
  );

  const setPage = useCallback(
    (nextPage: number) => {
      const current = decodeBrowserSearch(currentSearch());
      const next = toSearchParams(
        current.filters,
        { page: Math.max(1, nextPage), perPage: 10 },
        { includeDefaults: false, legacyNames: true }
      );
      applyParams(next);
    },
    [applyParams]
  );

  const clearFilters = useCallback(() => {
    applyParams(new URLSearchParams());
  }, [applyParams]);

  const hasActiveFilters =
    toSearchParams(
      filters,
      { page: 1, perPage: 10 },
      { includeDefaults: false, legacyNames: true }
    ).toString() !== '';
  const [isFilterVisible, setIsFilterVisible] = useState(hasActiveFilters);

  return { filters, setFilters, clearFilters, page, setPage, isFilterVisible, setIsFilterVisible };
}
