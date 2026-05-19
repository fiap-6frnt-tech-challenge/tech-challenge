'use client';

import type { TransactionFiltersValue } from '@/components/features/TransactionFilters';
import { TransactionService } from '@/services';
import type { Transaction } from '@/types';
import { useCallback, useEffect, useState } from 'react';

interface PaginatedState {
  transactions: Transaction[];
  totalPages: number;
  totalItems: number;
  isError: boolean;
  /** Serialized params of the last completed fetch — used to derive isLoading. */
  fetchedKey: string;
}

export function usePaginatedTransactions(filters: TransactionFiltersValue, page: number) {
  const { type, dateFrom, dateTo, sortBy, sortOrder } = filters;

  // A string that uniquely identifies the current set of request params.
  // When it differs from state.fetchedKey, the data is stale → isLoading is true.
  const paramsKey = `${page}|${type}|${dateFrom}|${dateTo}|${sortBy}|${sortOrder}`;

  const [state, setState] = useState<PaginatedState>({
    transactions: [],
    totalPages: 1,
    totalItems: 0,
    isError: false,
    fetchedKey: '',
  });

  // Derived — no setState needed to show the loading indicator.
  const isLoading = paramsKey !== state.fetchedKey;

  useEffect(() => {
    let cancelled = false;
    const key = paramsKey;

    // Use .then()/.catch() so setState is called inside promise callbacks,
    // not synchronously in the effect body (satisfies react-hooks/set-state-in-effect).
    TransactionService.getPaginated({ page, type, dateFrom, dateTo, sortBy, sortOrder })
      .then((result) => {
        if (!cancelled) {
          setState({
            transactions: result.data ?? [],
            totalPages: Math.max(1, result.pages ?? 1),
            totalItems: result.items ?? 0,
            isError: false,
            fetchedKey: key,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState((prev) => ({ ...prev, isError: true, fetchedKey: key }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [paramsKey, page, type, dateFrom, dateTo, sortBy, sortOrder]);

  const refetch = useCallback(async () => {
    const key = `${page}|${type}|${dateFrom}|${dateTo}|${sortBy}|${sortOrder}`;
    try {
      const result = await TransactionService.getPaginated({
        page,
        type,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder,
      });
      setState({
        transactions: result.data ?? [],
        totalPages: Math.max(1, result.pages ?? 1),
        totalItems: result.items ?? 0,
        isError: false,
        fetchedKey: key,
      });
    } catch {
      setState((prev) => ({ ...prev, isError: true }));
    }
  }, [page, type, dateFrom, dateTo, sortBy, sortOrder]);

  return {
    transactions: state.transactions,
    totalPages: state.totalPages,
    totalItems: state.totalItems,
    isLoading,
    isError: state.isError,
    refetch,
  };
}
