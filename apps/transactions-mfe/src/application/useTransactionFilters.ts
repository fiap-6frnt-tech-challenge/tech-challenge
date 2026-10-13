import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { fromBrowserSearchParams, hasActiveFilter, toBrowserSearchParams } from '@bytebank/core';
import type { TransactionFilter } from '@bytebank/core';
import type { FilterStateStorage } from './ports/FilterStateStorage';
import { useAmountStream } from './useAmountStream';
import { useSearchStream } from './useSearchStream';

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

  const patchFilters = useCallback(
    (patch: Partial<TransactionFilter>) => {
      const current = fromBrowserSearchParams(storage.read()).filter;
      storage.write(toBrowserSearchParams({ ...current, ...patch }));
    },
    [storage]
  );

  const emitSearch = useSearchStream((q) => patchFilters({ q }));
  const emitMinAmount = useAmountStream((amount_gte) => patchFilters({ amount_gte }));
  const emitMaxAmount = useAmountStream((amount_lte) => patchFilters({ amount_lte }));

  const setPage = useCallback(
    (nextPage: number) => {
      const current = fromBrowserSearchParams(storage.read());
      storage.write(toBrowserSearchParams(current.filter, nextPage));
    },
    [storage]
  );

  const clearFilters = useCallback(() => {
    emitSearch('');
    emitMinAmount(undefined);
    emitMaxAmount(undefined);
    storage.write(new URLSearchParams());
  }, [emitSearch, emitMinAmount, emitMaxAmount, storage]);

  const [isFilterVisible, setIsFilterVisible] = useState(() => hasActiveFilter(filters));

  return {
    filters,
    setFilters,
    clearFilters,
    emitSearch,
    emitMinAmount,
    emitMaxAmount,
    page,
    setPage,
    isFilterVisible,
    setIsFilterVisible,
  };
}
