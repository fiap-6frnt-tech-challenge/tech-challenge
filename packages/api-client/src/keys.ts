import { defaultSummaryRange } from '@bytebank/core';
import type { SummaryRange, TransactionListFilter } from './gateways/types';

export type TransactionsPageParams = TransactionListFilter & { perPage: number };

export function normalizeTransactionsPageParams(
  params: TransactionListFilter
): TransactionsPageParams {
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

export function resolveSummaryRange(range: SummaryRange = {}): Required<SummaryRange> {
  return { ...defaultSummaryRange(), ...range };
}

export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
};

export const overviewKeys = {
  all: ['overview'] as const,
};

export const summaryKeys = {
  all: ['summary'] as const,
  range: (range: { from?: string; to?: string }) => [...summaryKeys.all, range] as const,
};

export const attachmentKeys = {
  list: (transactionId: string) =>
    [...transactionKeys.detail(transactionId), 'attachments'] as const,
};
