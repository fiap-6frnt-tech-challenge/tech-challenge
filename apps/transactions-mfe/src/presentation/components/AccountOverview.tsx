'use client';

import { lazy, Suspense, useEffect, useState } from 'react';
import { Plus, ReceiptText } from 'lucide-react';
import { Button, EmptyState, ErrorState } from '@bytebank/design-system';
import { useAccountOverview } from '@bytebank/api-client';
import { markContentReady, shouldPrefetch } from '@bytebank/shared';
import { selectUser, useAppSelector } from '@bytebank/stores';
import { BalanceCard } from './BalanceCard';
import { MfeNavigationLink } from './MfeNavigationLink';
import { TransactionList } from './TransactionList';

const loadNewTransactionModal = () => import('./NewTransactionModal');

const NewTransactionModal = lazy(() =>
  loadNewTransactionModal().then((m) => ({ default: m.NewTransactionModal }))
);

function preloadNewTransactionModal() {
  if (shouldPrefetch()) void loadNewTransactionModal();
}

export default function AccountOverview() {
  const { data, isLoading, isError } = useAccountOverview();
  const user = useAppSelector(selectUser);
  const firstName = user?.name?.split(' ')[0];
  const [isNewTransactionVisible, setIsNewTransactionVisible] = useState(false);
  const [hasOpenedNewTransaction, setHasOpenedNewTransaction] = useState(false);

  useEffect(() => {
    if (!isLoading) markContentReady('overview');
  }, [isLoading]);

  if (isError) {
    return <ErrorState />;
  }

  function openNewTransaction() {
    setHasOpenedNewTransaction(true);
    setIsNewTransactionVisible(true);
  }

  return (
    <>
      <section aria-labelledby="recent-tx-heading" className="flex flex-col gap-lg">
        <BalanceCard balance={data?.balance ?? 0} owner={firstName} isLoading={isLoading} />

        <h2 id="recent-tx-heading" className="sr-only">
          Transações recentes
        </h2>

        <TransactionList
          transactions={data?.recent ?? []}
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
          <MfeNavigationLink href="/transactions" className="w-full sm:w-auto">
            Todas as transações
          </MfeNavigationLink>

          <Button
            disabled={isLoading}
            className="w-full sm:w-auto"
            onPointerEnter={preloadNewTransactionModal}
            onFocus={preloadNewTransactionModal}
            onClick={openNewTransaction}
          >
            <Plus size={16} aria-hidden="true" />
            Nova transação
          </Button>
        </span>
      </section>

      {hasOpenedNewTransaction && (
        <Suspense fallback={<p role="status">Carregando formulário...</p>}>
          <NewTransactionModal
            isOpen={isNewTransactionVisible}
            onCancel={() => setIsNewTransactionVisible(false)}
          />
        </Suspense>
      )}
    </>
  );
}
