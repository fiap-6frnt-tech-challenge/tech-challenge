import type { TransactionFiltersValue } from '@/components/features/TransactionFilters';
import { DEFAULT_FILTERS } from '@/components/features/TransactionFilters';
import { useRouter, useSearchParams } from 'next/navigation';
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

export function useTransactionFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = parseFiltersFromParams(searchParams);
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));

  const setFilters = useCallback(
    (next: TransactionFiltersValue) => {
      // Filter changes always reset to page 1 (page param omitted)
      const params = buildFilterParams(next);
      router.replace(params.toString() ? `?${params.toString()}` : '?', { scroll: false });
    },
    [router]
  );

  const setPage = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextPage <= 1) {
        params.delete('page');
      } else {
        params.set('page', String(nextPage));
      }
      router.replace(params.toString() ? `?${params.toString()}` : '?', { scroll: false });
    },
    [router, searchParams]
  );

  const clearFilters = useCallback(() => {
    router.replace('?', { scroll: false });
  }, [router]);

  const hasActiveFilters = searchParams.toString() !== '';
  const [isFilterVisible, setIsFilterVisible] = useState(hasActiveFilters);

  return { filters, setFilters, clearFilters, page, setPage, isFilterVisible, setIsFilterVisible };
}
