import { queryOptions } from '@tanstack/react-query';
import type { GetPaginatedParams, SummaryRange } from '../http';
import {
  attachmentKeys,
  normalizeTransactionsPageParams,
  overviewKeys,
  resolveSummaryRange,
  summaryKeys,
  transactionKeys,
} from '../keys';
import { TransactionHttpGateway } from '../gateways/TransactionHttpGateway';
import { AttachmentHttpGateway } from '../gateways/AttachmentHttpGateway';
import { cachePolicy } from './cachePolicy';

const transactions = new TransactionHttpGateway();
const attachments = new AttachmentHttpGateway();

export function transactionsPageQuery(params: GetPaginatedParams) {
  const normalized = normalizeTransactionsPageParams(params);
  return queryOptions({
    ...cachePolicy.transactionsPage,
    queryKey: transactionKeys.list({ ...normalized }),
    queryFn: ({ signal }) => {
      const { page, perPage, ...filter } = normalized;
      return transactions.list(filter, { page, perPage }, { signal });
    },
  });
}

export function accountOverviewQuery() {
  return queryOptions({
    ...cachePolicy.overview,
    queryKey: overviewKeys.all,
    queryFn: ({ signal }) => transactions.overview({ signal }),
  });
}

export function dashboardSummaryQuery(range: SummaryRange = {}) {
  const effectiveRange = resolveSummaryRange(range);
  return queryOptions({
    ...cachePolicy.summary,
    queryKey: summaryKeys.range(effectiveRange),
    queryFn: ({ signal }) => transactions.summary(effectiveRange, { signal }),
  });
}

export function transactionDetailQuery(id: string) {
  return queryOptions({
    ...cachePolicy.transactionDetail,
    queryKey: transactionKeys.detail(id),
    queryFn: ({ signal }) => transactions.get(id, { signal }),
    enabled: !!id,
  });
}

export function transactionAttachmentsQuery(id: string) {
  return queryOptions({
    ...cachePolicy.attachments,
    queryKey: attachmentKeys.list(id),
    queryFn: ({ signal }) => attachments.list(id, { signal }),
    enabled: !!id,
  });
}
