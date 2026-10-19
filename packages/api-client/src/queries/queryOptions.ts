import { queryOptions } from '@tanstack/react-query';
import type { GetPaginatedParams, SummaryRange } from '../http';
import { overviewKeys, summaryKeys, transactionKeys } from '../keys';
import { TransactionHttpGateway } from '../gateways/TransactionHttpGateway';

const transactions = new TransactionHttpGateway();

function getDefaultSummaryRange(now = new Date()): Required<SummaryRange> {
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

function normalizeTransactionsPageParams(params: GetPaginatedParams): GetPaginatedParams {
  return {
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
}

export function transactionsPageQuery(params: GetPaginatedParams) {
  const normalized = normalizeTransactionsPageParams(params);
  return queryOptions({
    queryKey: transactionKeys.list({ ...normalized }),
    queryFn: ({ signal }) => {
      const { page, perPage, ...filter } = normalized;
      return transactions.list(filter, { page, perPage: perPage ?? 10 }, { signal });
    },
  });
}

export function accountOverviewQuery() {
  return queryOptions({
    queryKey: overviewKeys.all,
    queryFn: ({ signal }) => transactions.overview({ signal }),
  });
}

export function dashboardSummaryQuery(range: SummaryRange = {}) {
  const effectiveRange = { ...getDefaultSummaryRange(), ...range };
  return queryOptions({
    queryKey: summaryKeys.range(effectiveRange),
    queryFn: ({ signal }) => transactions.summary(effectiveRange, { signal }),
    staleTime: 60_000,
  });
}
