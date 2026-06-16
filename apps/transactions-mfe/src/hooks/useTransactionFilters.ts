import type { TransactionFiltersValue } from '../components/TransactionFilters';
import { DEFAULT_FILTERS } from '../components/TransactionFilters';
import { useCallback, useState } from 'react';

function parseFiltersFromParams(params: URLSearchParams): TransactionFiltersValue {
  return {
    type: (params.get('type') as TransactionFiltersValue['type']) ?? DEFAULT_FILTERS.type,
    dateFrom: params.get('dateFrom') ?? DEFAULT_FILTERS.dateFrom,
    dateTo: params.get('dateTo') ?? DEFAULT_FILTERS.dateTo,
    sortBy: (params.get('sortBy') as TransactionFiltersValue['sortBy']) ?? DEFAULT_FILTERS.sortBy,
    sortOrder:
      (params.get('sortOrder') as TransactionFiltersValue['sortOrder']) ??
      DEFAULT_FILTERS.sortOrder,
  };
}

function buildFilterParams(filters: TransactionFiltersValue): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.type !== DEFAULT_FILTERS.type) params.set('type', filters.type);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.sortBy !== DEFAULT_FILTERS.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder !== DEFAULT_FILTERS.sortOrder) params.set('sortOrder', filters.sortOrder);
  return params;
}

function currentSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

export function useTransactionFilters() {
  const [search, setSearch] = useState<string>(() => currentSearch());

  const params = new URLSearchParams(search);
  const filters = parseFiltersFromParams(params);
  const page = Math.max(1, Number(params.get('page') ?? '1'));

  const applyParams = useCallback((next: URLSearchParams) => {
    const query = next.toString();
    const url = query ? `?${query}` : window.location.pathname;
    window.history.replaceState(window.history.state, '', url);
    setSearch(query ? `?${query}` : '');
  }, []);

  const setFilters = useCallback(
    (next: TransactionFiltersValue) => {
      // Filter changes always reset to page 1 (page param omitted)
      applyParams(buildFilterParams(next));
    },
    [applyParams]
  );

  const setPage = useCallback(
    (nextPage: number) => {
      const next = new URLSearchParams(currentSearch());
      if (nextPage <= 1) {
        next.delete('page');
      } else {
        next.set('page', String(nextPage));
      }
      applyParams(next);
    },
    [applyParams]
  );

  const clearFilters = useCallback(() => {
    applyParams(new URLSearchParams());
  }, [applyParams]);

  const hasActiveFilters = search.replace(/^\?/, '') !== '';
  const [isFilterVisible, setIsFilterVisible] = useState(hasActiveFilters);

  return { filters, setFilters, clearFilters, page, setPage, isFilterVisible, setIsFilterVisible };
}
