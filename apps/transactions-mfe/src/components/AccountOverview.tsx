'use client';

import { useMemo, useState } from 'react';
import { Plus, ReceiptText } from 'lucide-react';
import { Button, EmptyState, ErrorState } from '@bytebank/design-system';
import { useTransactions } from '@bytebank/api-client';
import { selectUser, useAppSelector } from '@bytebank/stores';
import { calculateBalance, getRecent } from '@bytebank/shared';
import { BalanceCard } from './BalanceCard';
import { TransactionList } from './TransactionList';
import { NewTransactionModal } from './NewTransactionModal';

export default function AccountOverview() {
  const { data, isLoading, isError } = useTransactions();
  const user = useAppSelector(selectUser);
  const firstName = user?.name?.split(' ')[0];
  const recentTransactions = useMemo(() => getRecent(data ?? [], 5), [data]);
  const balance = useMemo(() => calculateBalance(data ?? []), [data]);
  const [isNewTransactionVisible, setIsNewTransactionVisible] = useState(false);

  if (isError) {
    return <ErrorState />;
  }

  return (
    <>
      <section aria-labelledby="recent-tx-heading" className="flex flex-col gap-lg">
        <BalanceCard balance={balance} owner={firstName} isLoading={isLoading} />

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

        <span className="flex flex-col gap-sm sm:flex-row sm:items-center">
          <a href="/transactions" className="w-full sm:w-auto">
            <Button disabled={isLoading} className="w-full">
              Todas as transações
            </Button>
          </a>

          <Button
            disabled={isLoading}
            className="w-full sm:w-auto"
            onClick={() => setIsNewTransactionVisible(true)}
          >
            <Plus size={16} aria-hidden="true" />
            Nova transação
          </Button>
        </span>
      </section>

      <NewTransactionModal
        isOpen={isNewTransactionVisible}
        onCancel={() => setIsNewTransactionVisible(false)}
      />
    </>
  );
}
