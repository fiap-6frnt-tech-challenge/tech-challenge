'use client';

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { Transaction, NewTransaction, UpdateTransaction } from '@/types';
import { calculateBalance, getRecent, getAll } from '@/lib/transactions';
import { TransactionService } from '@/services';
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
    fetchTransactions();
  }, []);

  const addTransaction = async (data: NewTransaction) => {
    const created = await TransactionService.create(data);
    setTransactionsMap((prev) => new Map(prev).set(created.id, created));
  };

  const updateTransaction = async (id: string, data: UpdateTransaction) => {
    const updated = await TransactionService.update(id, data);
    setTransactionsMap((prev) => new Map(prev).set(id, updated));
  };

  const deleteTransaction = async (id: string) => {
    await TransactionService.remove(id);
    setTransactionsMap((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <TransactionsContext.Provider
      value={{
        transactions: getAll(transactions),
        balance: calculateBalance(transactions),
        recentTransactions: getRecent(transactions),
        isLoading,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        isError,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions(): TransactionsContextValue {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used inside <TransactionsProvider>');
  return ctx;
}
