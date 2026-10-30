import type { DashboardSummary } from '../dashboard/DashboardSummary';
import { buildDashboardSummary, type SummarySeries } from '../dashboard/summarize';
import type { SummaryDateRange } from '../dashboard/summaryRange';
import { Money } from '../money/Money';
import type { BalancePoint, CategoryAggregate, MonthlyAggregate } from './rules';
import { createTransaction, type NewTransaction, type Transaction } from './Transaction';
import { TRANSACTION_TYPE } from './TransactionType';

export const OPTIMISTIC_ID_PREFIX = 'optimistic-';

export interface OverviewSnapshot {
  balance: number;
  recent: Transaction[];
}

type Sign = 1 | -1;

export function isOptimisticId(id: string): boolean {
  return id.startsWith(OPTIMISTIC_ID_PREFIX);
}

export function createOptimisticTransaction(input: NewTransaction, uuid: string): Transaction {
  return createTransaction(input, `${OPTIMISTIC_ID_PREFIX}${uuid}`, '');
}

function signedAmount({ type, amount }: Transaction): Money {
  if (type === TRANSACTION_TYPE.DEPOSIT) return Money.fromDecimal(amount);
  if (type === TRANSACTION_TYPE.WITHDRAWAL) return Money.fromDecimal(-amount);
  return Money.zero();
}

function plus(value: number, delta: Money): number {
  return Money.fromDecimal(value).add(delta).toDecimal();
}

const newestFirst = (a: Transaction, b: Transaction) => b.date.localeCompare(a.date);

export function applyOptimisticCreate<T extends OverviewSnapshot>(
  overview: T,
  transaction: Transaction,
  limit = 5
): T {
  return {
    ...overview,
    balance: plus(overview.balance, signedAmount(transaction)),
    recent: [transaction, ...overview.recent].sort(newestFirst).slice(0, limit),
  };
}

export function applyOptimisticUpdate<T extends OverviewSnapshot>(
  overview: T,
  previous: Transaction,
  next: Transaction
): T {
  return {
    ...overview,
    balance: plus(overview.balance, signedAmount(next).subtract(signedAmount(previous))),
    recent: overview.recent
      .map((item) => (item.id === previous.id ? next : item))
      .sort(newestFirst),
  };
}

function inRange(date: string, range: SummaryDateRange): boolean {
  return date >= range.from && date <= range.to;
}

function withMonthTotals(
  byMonth: MonthlyAggregate[],
  transaction: Transaction,
  sign: Sign
): MonthlyAggregate[] {
  const month = transaction.date.slice(0, 7);
  const amount = Money.fromDecimal(sign * transaction.amount);
  const known = byMonth.some((entry) => entry.month === month);
  if (!known && sign === -1) return byMonth;
  const months = known
    ? byMonth
    : [...byMonth, { month, income: 0, expense: 0 }].sort((a, b) => a.month.localeCompare(b.month));
  return months.map((entry) => {
    if (entry.month !== month) return entry;
    if (transaction.type === TRANSACTION_TYPE.DEPOSIT)
      return { ...entry, income: plus(entry.income, amount) };
    if (transaction.type === TRANSACTION_TYPE.WITHDRAWAL)
      return { ...entry, expense: plus(entry.expense, amount) };
    return entry;
  });
}

function withCategoryTotal(
  byCategory: CategoryAggregate[],
  transaction: Transaction,
  sign: Sign
): CategoryAggregate[] {
  if (transaction.type !== TRANSACTION_TYPE.WITHDRAWAL) return byCategory;
  const amount = Money.fromDecimal(sign * transaction.amount);
  const known = byCategory.some((entry) => entry.category === transaction.category);
  if (!known && sign === -1) return byCategory;
  const categories = known
    ? byCategory
    : [...byCategory, { category: transaction.category, total: 0 }];
  return categories
    .map((entry) =>
      entry.category === transaction.category
        ? { ...entry, total: plus(entry.total, amount) }
        : entry
    )
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}

function shift(points: BalancePoint[], delta: Money): BalancePoint[] {
  return points.map((point) => ({ ...point, balance: plus(point.balance, delta) }));
}

function withPoint(points: BalancePoint[], transaction: Transaction): BalancePoint[] {
  const index = points.filter((point) => point.date < transaction.date).length;
  const delta = signedAmount(transaction);
  const later = shift(points.slice(index), delta);
  if (points[index]?.date === transaction.date) return [...points.slice(0, index), ...later];
  const point = { date: transaction.date, balance: plus(points[index - 1]?.balance ?? 0, delta) };
  return [...points.slice(0, index), point, ...later];
}

function withoutPoint(points: BalancePoint[], transaction: Transaction): BalancePoint[] {
  const index = points.findIndex((point) => point.date === transaction.date);
  if (index === -1) return points;
  const delta = Money.zero().subtract(signedAmount(transaction));
  const later = shift(points.slice(index), delta);
  const unchanged = later[0].balance === (points[index - 1]?.balance ?? 0);
  return [...points.slice(0, index), ...(unchanged ? later.slice(1) : later)];
}

function contribute(series: SummarySeries, transaction: Transaction, sign: Sign): SummarySeries {
  return {
    byMonth: withMonthTotals(series.byMonth, transaction, sign),
    byCategory: withCategoryTotal(series.byCategory, transaction, sign),
    balanceOverTime:
      sign === 1
        ? withPoint(series.balanceOverTime, transaction)
        : withoutPoint(series.balanceOverTime, transaction),
  };
}

export function applyOptimisticSummaryCreate(
  summary: DashboardSummary,
  range: SummaryDateRange,
  transaction: Transaction
): DashboardSummary {
  if (!inRange(transaction.date, range)) return summary;
  return buildDashboardSummary(contribute(summary, transaction, 1));
}

export function applyOptimisticSummaryUpdate(
  summary: DashboardSummary,
  range: SummaryDateRange,
  previous: Transaction,
  next: Transaction
): DashboardSummary {
  let series: SummarySeries = summary;
  if (inRange(previous.date, range)) series = contribute(series, previous, -1);
  if (inRange(next.date, range)) series = contribute(series, next, 1);
  return series === summary ? summary : buildDashboardSummary(series);
}
