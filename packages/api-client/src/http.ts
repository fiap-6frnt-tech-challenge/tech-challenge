import { AttachmentHttpGateway } from './gateways/AttachmentHttpGateway';
import { TransactionHttpGateway } from './gateways/TransactionHttpGateway';
import { configureApiBaseUrl } from './http/httpClient';
import type { RequestOptions, TransactionListFilter } from './gateways/types';
export { configureApiBaseUrl };
export { HttpError } from './http/httpClient';
export type { TransactionListFilter as GetPaginatedParams, SummaryRange } from './gateways/types';
export type PaginatedResponse = import('./gateways/types').Page<
  import('@bytebank/shared').Transaction
>;
export const TRANSACTIONS_PER_PAGE = 10;
const transactions = new TransactionHttpGateway();
const attachments = new AttachmentHttpGateway();
export const TransactionService = {
  getOverview: (options?: RequestOptions) => transactions.overview(options),
  getById: (id: string) => transactions.get(id),
  create: (data: Parameters<typeof transactions.create>[0]) => transactions.create(data),
  update: (id: string, data: Parameters<typeof transactions.update>[1]) =>
    transactions.update(id, data),
  remove: (id: string) => transactions.remove(id),
  getPaginated: (filter: TransactionListFilter) => {
    const { page, perPage, ...criteria } = filter;
    return transactions.list(criteria, { page, perPage: perPage ?? 10 });
  },
};
export const SummaryService = {
  get: (range?: import('./gateways/types').SummaryRange) => transactions.summary(range),
};
export const AttachmentService = {
  list: (id: string) => attachments.list(id),
  upload: (id: string, file: File) => attachments.upload(id, file),
  remove: (id: string, attachmentId: string) => attachments.remove(id, attachmentId),
};
