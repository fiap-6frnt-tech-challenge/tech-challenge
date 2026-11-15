export { Money } from './money/Money';
export { TRANSACTION_TYPE, type TransactionType } from './transaction/TransactionType';
export type {
  Attachment,
  Transaction,
  Account,
  NewTransaction,
  UpdateTransaction,
} from './transaction/Transaction';
export {
  getAll,
  getRecent,
  calculateBalance,
  aggregateByMonth,
  cumulativeBalance,
  groupByCategory,
} from './transaction/rules';
export type { MonthlyAggregate, BalancePoint, CategoryAggregate } from './transaction/rules';
export { CATEGORIES, categoryLabel, type Category, type CategoryId } from './category/categories';
export { suggestCategory } from './category/suggestCategory';
export type { DashboardSummary } from './dashboard/DashboardSummary';
export {
  ATTACHMENT_MAX_SIZE_BYTES,
  ATTACHMENT_MIME_TYPES,
  detectAttachmentType,
  type AttachmentMimeType,
} from './attachment/fileType';
export {
  fromSearchParams,
  toSearchParams,
  normalizeTransactionFilter,
  fromBrowserSearchParams,
  toBrowserSearchParams,
  hasActiveFilter,
} from './filter/TransactionFilter';
export type {
  TransactionFilter,
  PageRequest,
  BrowserFilterState,
} from './filter/TransactionFilter';
export { computeKpiDeltas, topCategoriesWithOthers } from './dashboard/kpis';
export type { KpiDeltas, CategorySlice } from './dashboard/kpis';
export { defaultSummaryRange, SUMMARY_MONTHS, SUMMARY_TIME_ZONE } from './dashboard/summaryRange';
export type { SummaryDateRange } from './dashboard/summaryRange';
export { buildDashboardSummary } from './dashboard/summarize';
export type { SummarySeries } from './dashboard/summarize';
export { createTransaction } from './transaction/Transaction';
export {
  OPTIMISTIC_ID_PREFIX,
  isOptimisticId,
  createOptimisticTransaction,
  applyOptimisticCreate,
  applyOptimisticUpdate,
  applyOptimisticSummaryCreate,
  applyOptimisticSummaryUpdate,
} from './transaction/optimistic';
export type { OverviewSnapshot } from './transaction/optimistic';
export {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitedError,
  TurnstileRequiredError,
  AuthenticationError,
  InvalidFileError,
} from './errors';
export type { DomainEvent } from './events';
