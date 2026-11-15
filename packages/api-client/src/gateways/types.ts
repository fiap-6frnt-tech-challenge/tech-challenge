import type {
  AttachmentGateway,
  GatewayRequestOptions,
  TransactionGateway,
  TransactionGatewayPage,
} from '@bytebank/core/application';
import type { Attachment } from '@bytebank/core';
import type { DateRange } from '@bytebank/core/application';
import type { TransactionFilter } from '@bytebank/core';

export type { AttachmentGateway, TransactionGateway };
export type Page<T> = Omit<TransactionGatewayPage, 'data'> & { data: T[] };
export type TransactionListFilter = Partial<TransactionFilter> & { page: number; perPage?: number };
export type SummaryRange = Partial<DateRange>;
export type RequestOptions = GatewayRequestOptions;

export type AttachmentUploadEvent =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'done'; attachment: Attachment };
