import type { Transaction } from '@/types';
import { TRANSACTION_TYPE } from '@/shared/constants/transaction';

export function getAll(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function calculateBalance(transactions: Transaction[]): number {
  return transactions.reduce((acc, t) => {
    if (t.type === TRANSACTION_TYPE.DEPOSIT) return acc + t.amount;
    if (t.type === TRANSACTION_TYPE.WITHDRAWAL) return acc - t.amount;
    return acc; // transfers are neutral (internal movement)
  }, 0);
}

export function getRecent(transactions: Transaction[], limit = 5): Transaction[] {
  return getAll(transactions).slice(0, limit);
}
