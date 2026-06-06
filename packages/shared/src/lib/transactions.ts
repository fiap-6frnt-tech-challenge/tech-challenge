import type { Transaction } from '../types';
import { TRANSACTION_TYPE } from '../constants/transaction';

export interface MonthlyAggregate {
  month: string;
  income: number;
  expense: number;
}

export interface BalancePoint {
  date: string;
  balance: number;
}

export interface CategoryAggregate {
  category: string;
  total: number;
}

export function getAll(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function calculateBalance(transactions: Transaction[]): number {
  return transactions.reduce((acc, t) => {
    if (t.type === TRANSACTION_TYPE.DEPOSIT) return acc + t.amount;
    if (t.type === TRANSACTION_TYPE.WITHDRAWAL) return acc - t.amount;
    return acc;
  }, 0);
}

export function getRecent(transactions: Transaction[], limit = 5): Transaction[] {
  return getAll(transactions).slice(0, limit);
}

export function aggregateByMonth(transactions: Transaction[]): MonthlyAggregate[] {
  const map = new Map<string, MonthlyAggregate>();
  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    const entry = map.get(month) ?? { month, income: 0, expense: 0 };
    if (t.type === TRANSACTION_TYPE.DEPOSIT) entry.income += t.amount;
    else if (t.type === TRANSACTION_TYPE.WITHDRAWAL) entry.expense += t.amount;
    map.set(month, entry);
  }
  return [...map.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}

export function cumulativeBalance(transactions: Transaction[]): BalancePoint[] {
  const ordered = [...transactions].sort((a, b) => (a.date < b.date ? -1 : 1));
  let running = 0;
  return ordered.map((t) => {
    if (t.type === TRANSACTION_TYPE.DEPOSIT) running += t.amount;
    else if (t.type === TRANSACTION_TYPE.WITHDRAWAL) running -= t.amount;
    return { date: t.date, balance: running };
  });
}

export function groupByCategory(transactions: Transaction[]): CategoryAggregate[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== TRANSACTION_TYPE.WITHDRAWAL) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}
