import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { Transaction, NewTransaction, UpdateTransaction } from '@bytebank/shared';
import { TransactionService, type GetPaginatedParams, type PaginatedResponse } from './http';
import { transactionKeys } from './keys';

type ListCache = Transaction[] | PaginatedResponse | undefined;

function removeFromListCache(old: ListCache, id: string): ListCache {
  if (!old) return old;
  if (Array.isArray(old)) return old.filter((t) => t.id !== id);
  return { ...old, data: old.data.filter((t) => t.id !== id), items: Math.max(0, old.items - 1) };
}

export function useTransactions() {
  return useQuery({
    queryKey: transactionKeys.list({}),
    queryFn: () => TransactionService.getAll(),
  });
}

export function usePaginatedTransactions(params: GetPaginatedParams) {
  return useQuery({
    queryKey: transactionKeys.list(params),
    queryFn: () => TransactionService.getPaginated(params),
    placeholderData: (prev) => prev,
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => TransactionService.getById(id),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newTx: NewTransaction) => TransactionService.create(newTx),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransaction }) =>
      TransactionService.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.detail(updated.id) });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => TransactionService.remove(id),

    onMutate: async (idToDelete) => {
      await queryClient.cancelQueries({ queryKey: transactionKeys.lists() });

      const previous = queryClient.getQueriesData<ListCache>({
        queryKey: transactionKeys.lists(),
      });

      queryClient.setQueriesData<ListCache>({ queryKey: transactionKeys.lists() }, (old) =>
        removeFromListCache(old, idToDelete)
      );

      return { previous };
    },

    onError: (_err, _id, context) => {
      context?.previous?.forEach(([key, data]: [QueryKey, ListCache]) => {
        queryClient.setQueryData(key, data);
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
}
