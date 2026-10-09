import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { fromBrowserSearchParams, hasActiveFilter, toBrowserSearchParams } from '@bytebank/core';
import type { TransactionFilter } from '@bytebank/core';
import type { FilterStateStorage } from './ports/FilterStateStorage';

export function useTransactionFilters(storage: FilterStateStorage) {
  const subscribe = useCallback((onChange: () => void) => storage.subscribe(onChange), [storage]);
  const search = useSyncExternalStore(
    subscribe,
    () => storage.read().toString(),
    () => ''
  );

  const { filter: filters, page } = useMemo(
    () => fromBrowserSearchParams(new URLSearchParams(search)),
    [search]
  );

  const setFilters = useCallback(
    (next: TransactionFilter) => storage.write(toBrowserSearchParams(next)),
    [storage]
  );

  const setPage = useCallback(
    (nextPage: number) => {
      const current = fromBrowserSearchParams(storage.read());
      storage.write(toBrowserSearchParams(current.filter, nextPage));
    },
    [storage]
  );

  const clearFilters = useCallback(() => storage.write(new URLSearchParams()), [storage]);

  const [isFilterVisible, setIsFilterVisible] = useState(() => hasActiveFilter(filters));

  return { filters, setFilters, clearFilters, page, setPage, isFilterVisible, setIsFilterVisible };
}
