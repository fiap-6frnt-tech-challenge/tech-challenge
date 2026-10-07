import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { Transaction, NewTransaction, UpdateTransaction } from '@bytebank/shared';
import {
  TransactionService,
  type GetPaginatedParams,
  type PaginatedResponse,
  type SummaryRange,
} from '../http';
import { summaryKeys, transactionKeys } from '../keys';
import { TransactionHttpGateway } from '../gateways/TransactionHttpGateway';
import { AttachmentHttpGateway } from '../gateways/AttachmentHttpGateway';
import { attachmentKeys } from '../keys';

const transactions = new TransactionHttpGateway();
const attachments = new AttachmentHttpGateway();

type ListCache = Transaction[] | PaginatedResponse | undefined;

function removeFromListCache(old: ListCache, id: string): ListCache {
  if (!old) return old;
  if (Array.isArray(old)) return old.filter((t) => t.id !== id);
  return { ...old, data: old.data.filter((t) => t.id !== id), items: Math.max(0, old.items - 1) };
}

function getDefaultSummaryRange(now = new Date()): Required<SummaryRange> {
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export function useDashboardSummary(range?: SummaryRange) {
  const effectiveRange = useMemo(
    () => ({ ...getDefaultSummaryRange(), ...range }),
    [range?.from, range?.to]
  );

  return useQuery({
    queryKey: summaryKeys.range(effectiveRange),
    queryFn: ({ signal }) => transactions.summary(effectiveRange, { signal }),
    staleTime: 60_000,
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: transactionKeys.list({}),
    queryFn: ({ signal }) => TransactionService.getAll({ signal }),
  });
}

export function useTransactionsPage(params: GetPaginatedParams) {
  // Normalize params so the cache key matches the actual request (defaults + omitting "all"/empty filters).
  const normalizedParams: GetPaginatedParams = {
    page: params.page,
    perPage: params.perPage ?? 10,
    sortBy: params.sortBy ?? 'date',
    sortOrder: params.sortOrder ?? 'desc',
    ...(params.type && params.type !== 'all' ? { type: params.type } : {}),
    ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
    ...(params.dateTo ? { dateTo: params.dateTo } : {}),
    ...(params.q ? { q: params.q } : {}),
    ...(params.amount_gte !== undefined ? { amount_gte: params.amount_gte } : {}),
    ...(params.amount_lte !== undefined ? { amount_lte: params.amount_lte } : {}),
    ...(params.category?.length ? { category: params.category } : {}),
  };

  return useQuery({
    queryKey: transactionKeys.list({ ...normalizedParams }),
    queryFn: ({ signal }) => {
      const { page, perPage, ...filter } = normalizedParams;
      return transactions.list(filter, { page, perPage: perPage ?? 10 }, { signal });
    },
    placeholderData: (prev) => prev,
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: ({ signal }) => transactions.get(id, { signal }),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newTx: NewTransaction) => transactions.create(newTx),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.overview() });
      queryClient.invalidateQueries({ queryKey: summaryKeys.all });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransaction }) =>
      transactions.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.overview() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.detail(updated.id) });
      queryClient.invalidateQueries({ queryKey: summaryKeys.all });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactions.remove(id),

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

    onSettled: (_data, _error, idToDelete) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.overview() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.detail(idToDelete) });
      queryClient.invalidateQueries({ queryKey: summaryKeys.all });
    },
  });
}

export function useAccountOverview() {
  return useQuery({
    queryKey: transactionKeys.overview(),
    queryFn: ({ signal }) => transactions.overview({ signal }),
  });
}

export function useTransactionAttachments(id: string) {
  return useQuery({
    queryKey: attachmentKeys.list(id),
    queryFn: ({ signal }) => attachments.list(id, { signal }),
    enabled: !!id,
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => attachments.upload(id, file),
    onSuccess: (_attachment, { id }) =>
      queryClient.invalidateQueries({ queryKey: attachmentKeys.list(id) }),
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, attachmentId }: { id: string; attachmentId: string }) =>
      attachments.remove(id, attachmentId),
    onSuccess: (_data, { id }) =>
      queryClient.invalidateQueries({ queryKey: attachmentKeys.list(id) }),
  });
}

// New names describe the query use cases; legacy names remain public through Sprint 2.
export const usePaginatedTransactions = useTransactionsPage;
