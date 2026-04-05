'use client';
import { BalanceCard } from '@/components/features/BalanceCard';
import { NewTransaction } from '@/components/features/NewTransaction';
import { TransactionList } from '@/components/features/TransactionList';
import { Button } from '@/components/ui/Button/Button';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTransactions } from '@/context/TransactionsContext';
import { ReceiptText } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

export default function Home() {
  const { transactions, balance, isLoading, isError } = useTransactions();
  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

  if (isError) {
    return <ErrorState />;
  }
  return (
    <div className="flex flex-col gap-lg lg:flex-row lg:items-start h-fit w-full px-1">
      <section
        aria-labelledby="overview-heading"
        className="flex flex-col gap-lg lg:flex-1 min-w-0"
      >
        <h1 id="overview-heading" className="sr-only">
          Visão geral da conta
        </h1>
        {isLoading ? (
          <Skeleton className=" h-134.5 md:h-91 w-full rounded-xl" />
        ) : (
          <BalanceCard balance={balance} owner="Joana" />
        )}

        <NewTransaction />
      </section>

      <section
        aria-labelledby="recent-tx-heading"
        className="lg:w-80 lg:shrink-0 flex flex-col gap-lg w-full min-w-0"
      >
        <h2 id="recent-tx-heading" className="sr-only">
          Transações recentes
        </h2>
        <TransactionList
          transactions={recentTransactions}
          onEdit={(id) => console.log(id)}
          onDelete={(id) => console.log(id)}
          title="Transações recentes"
          showActions={false}
          tooltipPosition="left"
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={<ReceiptText size={32} />}
              title="Nenhuma transação registrada"
              description="Registre sua primeira transação!"
              className="border border-gray-300 bg-white"
            />
          }
        />

        <Link href="/transactions">
          <Button className="w-full" disabled={isLoading}>
            Todas as transações
          </Button>
        </Link>
      </section>
    </div>
  );
}
