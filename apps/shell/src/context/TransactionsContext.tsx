'use client';

import { calculateBalance, getAll } from '@/lib/transactions';
import { TransactionService } from '@/services';
import type { NewTransaction, Transaction, UpdateTransaction } from '@/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface TransactionsContextValue {
  transactions: Transaction[];
  balance: number;
  recentTransactions: Transaction[];
  isLoading: boolean;
  isError: boolean;
  addTransaction: (data: NewTransaction) => Promise<void>;
  updateTransaction: (id: string, data: UpdateTransaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

// Module-level flag — survives component remounts within the same browser session.
// This prevents duplicate getAll() calls when Next.js remounts the provider during
// navigation (e.g. due to RSC reconciliation or StrictMode in development).
let initialFetchDone = false;

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactionsMap, setTransactionsMap] = useState<Map<string, Transaction>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Convert Map to array once — passed to lib helpers and exposed to consumers
  const transactions = useMemo(() => Array.from(transactionsMap.values()), [transactionsMap]);

  async function fetchTransactions() {
    setIsError(false);
    try {
      await new Promise((res) => setTimeout(res, 100));
      const data = await TransactionService.getAll();
      setTransactionsMap(new Map(data.map((t) => [t.id, t])));
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (initialFetchDone) return;
    initialFetchDone = true;
    fetchTransactions();
  }, []);

  const addTransaction = useCallback(async (data: NewTransaction) => {
    const created = await TransactionService.create(data);
    setTransactionsMap((prev) => new Map(prev).set(created.id, created));
  }, []);

  const updateTransaction = useCallback(async (id: string, data: UpdateTransaction) => {
    const updated = await TransactionService.update(id, data);
    setTransactionsMap((prev) => new Map(prev).set(id, updated));
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    await TransactionService.remove(id);
    setTransactionsMap((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const sorted = useMemo(() => getAll(transactions), [transactions]);

  const contextValue = useMemo(
    () => ({
      transactions: sorted,
      balance: calculateBalance(transactions),
      recentTransactions: sorted.slice(0, 5),
      isLoading,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      isError,
    }),
    [sorted, transactions, isLoading, isError, addTransaction, updateTransaction, deleteTransaction]
  );

  return (
    <TransactionsContext.Provider value={contextValue}>{children}</TransactionsContext.Provider>
  );
}

export function useTransactions(): TransactionsContextValue {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used inside <TransactionsProvider>');
  return ctx;
}
