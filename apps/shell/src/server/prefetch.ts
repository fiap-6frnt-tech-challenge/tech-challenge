import 'server-only';
import { dehydrate, QueryClient, type DehydratedState } from '@tanstack/react-query';
import {
  normalizeTransactionsPageParams,
  overviewKeys,
  resolveSummaryRange,
  summaryKeys,
  transactionKeys,
} from '@bytebank/api-client/keys';
import { fromBrowserSearchParams, fromSearchParams, toSearchParams } from '@bytebank/core';
import type { Actor } from '@bytebank/core/application';
import { auth } from '@/auth';
import { container } from './container';
import { publicTransactionsPage } from './http/transactionsPage';

export type PageSearchParams = Record<string, string | string[] | undefined>;

type Prefetch = (queryClient: QueryClient, actor: Actor) => Promise<void>[];

async function prefetchForSession(prefetch: Prefetch): Promise<DehydratedState | undefined> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return undefined;
  const queryClient = new QueryClient();
  await Promise.all(prefetch(queryClient, { userId }));
  return dehydrate(queryClient);
}

export function prefetchHome() {
  return prefetchForSession((queryClient, actor) => {
    const range = resolveSummaryRange();
    return [
      queryClient.prefetchQuery({
        queryKey: overviewKeys.all,
        queryFn: () => container.getAccountOverview.execute(actor),
      }),
      queryClient.prefetchQuery({
        queryKey: summaryKeys.range(range),
        queryFn: () => container.getTransactionsSummary.execute(actor, range),
      }),
    ];
  });
}

function toURLSearchParams(searchParams: PageSearchParams): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    for (const item of [value ?? []].flat()) search.append(key, item);
  }
  return search;
}

export function prefetchTransactions(searchParams: PageSearchParams) {
  return prefetchForSession((queryClient, actor) => {
    const { filter, page } = fromBrowserSearchParams(toURLSearchParams(searchParams));
    const params = normalizeTransactionsPageParams({ ...filter, page });
    return [
      queryClient.prefetchQuery({
        queryKey: transactionKeys.list({ ...params }),
        queryFn: async () => {
          const { page: pageNumber, perPage, ...criteria } = params;
          const request = fromSearchParams(toSearchParams(criteria, { page: pageNumber, perPage }));
          return publicTransactionsPage(
            await container.listTransactions.execute(actor, request.filter, request.page)
          );
        },
      }),
    ];
  });
}
