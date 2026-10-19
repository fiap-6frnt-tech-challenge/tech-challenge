import { useCallback, useEffect, useMemo } from 'react';
import { hashKey, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { tap, type Observable } from 'rxjs';
import type { DashboardSummary, NewTransaction, UpdateTransaction } from '@bytebank/core';
import { shouldPrefetch } from '@bytebank/shared';
import { publish, createClientSessionGuard, ClientSessionEndedError } from '@bytebank/stores';
import type { GetPaginatedParams, PaginatedResponse, SummaryRange } from '../http';
import type { AttachmentUploadEvent } from '../gateways/types';
import { attachmentKeys, overviewKeys, summaryKeys, transactionKeys } from '../keys';
import { TransactionHttpGateway } from '../gateways/TransactionHttpGateway';
import { AttachmentHttpGateway } from '../gateways/AttachmentHttpGateway';
import { useSessionMutation } from './useSessionMutation';
import { accountOverviewQuery, dashboardSummaryQuery, transactionsPageQuery } from './queryOptions';

const transactions = new TransactionHttpGateway();
const attachments = new AttachmentHttpGateway();

type ListCache = PaginatedResponse | undefined;
type MutationSession = { assertSession: () => void };
const beginMutation = (): MutationSession => ({ assertSession: createClientSessionGuard() });
function canApplyMutation(context: MutationSession | undefined): boolean {
  try {
    context?.assertSession();
    return true;
  } catch (error) {
    if (error instanceof ClientSessionEndedError) return false;
    throw error;
  }
}

function removeFromListCache(old: ListCache, id: string): ListCache {
  if (!old) return old;
  return { ...old, data: old.data.filter((t) => t.id !== id), items: Math.max(0, old.items - 1) };
}

export interface DashboardSummaryOptions<TData> extends SummaryRange {
  select?: (summary: DashboardSummary) => TData;
}

export function useDashboardSummary<TData = DashboardSummary>({
  select,
  ...range
}: DashboardSummaryOptions<TData> = {}) {
  const options = useMemo(() => dashboardSummaryQuery(range), [range.from, range.to]);

  return useQuery({ ...options, select });
}

export function useAccountOverview() {
  return useQuery(accountOverviewQuery());
}

export function useTransactionsPage(params: GetPaginatedParams) {
  return useQuery({ ...transactionsPageQuery(params), placeholderData: (prev) => prev });
}

export function usePrefetchNextTransactionsPage(
  params: GetPaginatedParams,
  totalPages: number | undefined
) {
  const queryClient = useQueryClient();
  const next =
    totalPages !== undefined && params.page < totalPages
      ? transactionsPageQuery({ ...params, page: params.page + 1 })
      : undefined;
  const nextKey = next ? hashKey(next.queryKey) : undefined;

  useEffect(() => {
    if (!next || !shouldPrefetch()) return;
    void queryClient.prefetchQuery(next);
  }, [queryClient, nextKey]);
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
  return useSessionMutation({
    onMutate: beginMutation,
    mutationFn: (newTx: NewTransaction) => transactions.create(newTx),
    onSuccess: (transaction, _input, context) => {
      if (!canApplyMutation(context)) return;
      publish({ type: 'transaction.created', version: 1, transaction });
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: overviewKeys.all });
      queryClient.invalidateQueries({ queryKey: summaryKeys.all });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useSessionMutation({
    onMutate: beginMutation,
    mutationFn: ({ id, data }: { id: string; data: UpdateTransaction }) =>
      transactions.update(id, data),
    onSuccess: (updated, _input, context) => {
      if (!canApplyMutation(context)) return;
      publish({ type: 'transaction.updated', version: 1, transaction: updated });
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.detail(updated.id) });
      queryClient.invalidateQueries({ queryKey: overviewKeys.all });
      queryClient.invalidateQueries({ queryKey: summaryKeys.all });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useSessionMutation<void, string, MutationSession & { previous: [QueryKey, ListCache][] }>({
    mutationFn: (id: string) => transactions.remove(id),
    onSuccess: (_result, id, context) => {
      if (!canApplyMutation(context)) return;
      publish({ type: 'transaction.deleted', version: 1, id });
    },

    onMutate: async (idToDelete) => {
      const assertSession = createClientSessionGuard();
      await queryClient.cancelQueries({ queryKey: transactionKeys.lists() });
      assertSession();

      const previous = queryClient.getQueriesData<ListCache>({
        queryKey: transactionKeys.lists(),
      });

      queryClient.setQueriesData<ListCache>({ queryKey: transactionKeys.lists() }, (old) =>
        removeFromListCache(old, idToDelete)
      );

      return { previous, assertSession };
    },

    onError: (_err, _id, context) => {
      if (!canApplyMutation(context)) return;
      context?.previous?.forEach(([key, data]: [QueryKey, ListCache]) => {
        queryClient.setQueryData(key, data);
      });
    },

    onSettled: (_data, error, idToDelete, context) => {
      if (error instanceof ClientSessionEndedError || !canApplyMutation(context)) return;
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.detail(idToDelete) });
      queryClient.invalidateQueries({ queryKey: overviewKeys.all });
      queryClient.invalidateQueries({ queryKey: summaryKeys.all });
    },
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
  const mutation = useSessionMutation({
    onMutate: beginMutation,
    mutationFn: ({ id, file }: { id: string; file: File }) => attachments.upload(id, file),
    onSuccess: (attachment, { id }, context) => {
      if (!canApplyMutation(context)) return;
      publish({
        type: 'attachment.added',
        version: 1,
        transactionId: id,
        attachmentId: attachment.id,
      });
      return queryClient.invalidateQueries({ queryKey: attachmentKeys.list(id) });
    },
  });

  const uploadStream = useCallback(
    (id: string, file: File): Observable<AttachmentUploadEvent> =>
      attachments.upload$(id, file).pipe(
        tap((event) => {
          if (event.type !== 'done') return;
          publish({
            type: 'attachment.added',
            version: 1,
            transactionId: id,
            attachmentId: event.attachment.id,
          });
          void queryClient.invalidateQueries({ queryKey: attachmentKeys.list(id) });
        })
      ),
    [queryClient]
  );

  const reconcileAttachments = useCallback(
    (id: string) =>
      queryClient.fetchQuery({
        queryKey: attachmentKeys.list(id),
        queryFn: ({ signal }) => attachments.list(id, { signal }),
        staleTime: 0,
      }),
    [queryClient]
  );

  return { ...mutation, uploadStream, reconcileAttachments };
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useSessionMutation({
    onMutate: beginMutation,
    mutationFn: ({ id, attachmentId }: { id: string; attachmentId: string }) =>
      attachments.remove(id, attachmentId),
    onSuccess: (_data, { id, attachmentId }, context) => {
      if (!canApplyMutation(context)) return;
      publish({ type: 'attachment.removed', version: 1, transactionId: id, attachmentId });
      return queryClient.invalidateQueries({ queryKey: attachmentKeys.list(id) });
    },
  });
}

// New names describe the query use cases; legacy names remain public through Sprint 2.
export const usePaginatedTransactions = useTransactionsPage;
