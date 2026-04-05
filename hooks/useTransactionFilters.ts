import { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Transaction } from '@/types';
import { DEFAULT_FILTERS } from '@/components/features/TransactionFilters';
import type { TransactionFiltersValue } from '@/components/features/TransactionFilters';

function matchesType(t: Transaction, type: TransactionFiltersValue['type']) {
  return type === 'all' || t.type === type;
}

function matchesDateFrom(t: Transaction, dateFrom: string) {
  return !dateFrom || t.date.slice(0, 10) >= dateFrom;
}

function matchesDateTo(t: Transaction, dateTo: string) {
  return !dateTo || t.date.slice(0, 10) <= dateTo;
}

function sortTransactions(a: Transaction, b: Transaction, filters: TransactionFiltersValue) {
  const dir = filters.sortOrder === 'asc' ? 1 : -1;
  if (filters.sortBy === 'amount') return (a.amount - b.amount) * dir;
  return (a.date < b.date ? -1 : 1) * dir;
}

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

export function useTransactionFilters(transactions: Transaction[]) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = parseFiltersFromParams(searchParams);

  const setFilters = useCallback(
    (next: TransactionFiltersValue) => {
      const params = new URLSearchParams();
      if (next.type !== DEFAULT_FILTERS.type) params.set('type', next.type);
      if (next.dateFrom) params.set('dateFrom', next.dateFrom);
      if (next.dateTo) params.set('dateTo', next.dateTo);
      if (next.sortBy !== DEFAULT_FILTERS.sortBy) params.set('sortBy', next.sortBy);
      if (next.sortOrder !== DEFAULT_FILTERS.sortOrder) params.set('sortOrder', next.sortOrder);

      const query = params.toString();
      router.replace(query ? `?${query}` : '?', { scroll: false });
    },
    [router]
  );

  const filtered = transactions
    .filter((t) => matchesType(t, filters.type))
    .filter((t) => matchesDateFrom(t, filters.dateFrom))
    .filter((t) => matchesDateTo(t, filters.dateTo))
    .sort((a, b) => sortTransactions(a, b, filters));

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [setFilters]);

  const hasActiveFilters = searchParams.toString() !== '';
  const [isFilterVisible, setIsFilterVisible] = useState(hasActiveFilters);

  return { filters, setFilters, clearFilters, filtered, isFilterVisible, setIsFilterVisible };
}
