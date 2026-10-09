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
export { CATEGORIES, type Category, type CategoryId } from './category/categories';
export { suggestCategory } from './category/suggestCategory';
export type { DashboardSummary } from './dashboard/DashboardSummary';
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
export { createTransaction } from './transaction/Transaction';
export {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitedError,
  AuthenticationError,
} from './errors';
export type { DomainEvent } from './events';
