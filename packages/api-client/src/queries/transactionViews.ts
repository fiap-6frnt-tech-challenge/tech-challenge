import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { DashboardSummary, SummaryDateRange, Transaction } from '@bytebank/core';
import type { AccountOverview } from '@bytebank/core/application';
import type { PaginatedResponse } from '../http';
import { overviewKeys, summaryKeys, transactionKeys } from '../keys';

export interface TransactionViewsSnapshot {
  overview: AccountOverview | undefined;
  summaries: [QueryKey, DashboardSummary | undefined][];
}

export interface TransactionViewsUpdate {
  overview: (overview: AccountOverview) => AccountOverview;
  summary: (summary: DashboardSummary, range: SummaryDateRange) => DashboardSummary;
}

export function invalidateTransactionViews(queryClient: QueryClient, id?: string) {
  queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
  if (id) queryClient.invalidateQueries({ queryKey: transactionKeys.detail(id) });
  queryClient.invalidateQueries({ queryKey: overviewKeys.all });
  queryClient.invalidateQueries({ queryKey: summaryKeys.all });
}

export function cancelTransactionViews(queryClient: QueryClient) {
  return Promise.all([
    queryClient.cancelQueries({ queryKey: overviewKeys.all }),
    queryClient.cancelQueries({ queryKey: summaryKeys.all }),
  ]);
}

export function applyToTransactionViews(
  queryClient: QueryClient,
  update: TransactionViewsUpdate
): TransactionViewsSnapshot {
  const snapshot: TransactionViewsSnapshot = {
    overview: queryClient.getQueryData<AccountOverview>(overviewKeys.all),
    summaries: queryClient.getQueriesData<DashboardSummary>({ queryKey: summaryKeys.all }),
  };
  if (snapshot.overview) {
    queryClient.setQueryData(overviewKeys.all, update.overview(snapshot.overview));
  }
  for (const [key, summary] of snapshot.summaries) {
    if (summary) queryClient.setQueryData(key, update.summary(summary, key[1] as SummaryDateRange));
  }
  return snapshot;
}

export function restoreTransactionViews(
  queryClient: QueryClient,
  snapshot: TransactionViewsSnapshot | undefined
) {
  if (!snapshot) return;
  if (snapshot.overview) queryClient.setQueryData(overviewKeys.all, snapshot.overview);
  for (const [key, summary] of snapshot.summaries) queryClient.setQueryData(key, summary);
}

export function findCachedTransaction(
  queryClient: QueryClient,
  id: string
): Transaction | undefined {
  const pages = queryClient.getQueriesData<PaginatedResponse>({
    queryKey: transactionKeys.lists(),
  });
  return [
    queryClient.getQueryData<Transaction>(transactionKeys.detail(id)),
    ...(queryClient.getQueryData<AccountOverview>(overviewKeys.all)?.recent ?? []),
    ...pages.flatMap(([, page]) => page?.data ?? []),
  ].find((transaction) => transaction?.id === id);
}
