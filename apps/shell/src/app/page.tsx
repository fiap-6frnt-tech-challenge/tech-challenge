'use client';
import { BalanceCard } from '@/components/features/BalanceCard';
import { TransactionList } from '@/components/features/TransactionList';
import { Button } from '@bytebank/design-system';
import { EmptyState } from '@bytebank/design-system';
import { ErrorState } from '@bytebank/design-system';
import { useTransactions } from '@bytebank/api-client';
import { calculateBalance, getRecent } from '@bytebank/shared';
import { ReceiptText } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo } from 'react';

const NewTransaction = dynamic(
  () => import('@/components/features/NewTransaction').then((m) => m.NewTransaction),
  { ssr: false }
);

export default function Home() {
  const { data, isLoading, isError } = useTransactions();
  const balance = useMemo(() => calculateBalance(data ?? []), [data]);
  const recentTransactions = useMemo(() => getRecent(data ?? [], 5), [data]);

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
        <BalanceCard balance={balance} owner="Joana" isLoading={isLoading} />

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
          onEdit={() => {}}
          onDelete={() => {}}
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
