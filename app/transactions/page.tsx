'use client';

import { Suspense, useState } from 'react';
import { TransactionList } from '@/components/features/TransactionList';
import { TransactionFilters } from '@/components/features/TransactionFilters';
import { SkeletonList } from '@/components/ui/Skeleton';
import { DeleteTransactionModal } from '@/components/features/DeleteTransactionModal';
import { useTransactions } from '@/context/TransactionsContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTransactionFilters } from '@/hooks';
import type { Transaction } from '@/types';
import { EditTransactionModal } from '@/components/features/EditTransactionModal';
import { TransactionFormValues } from '@/components/features';
import { EmptyState, IconButton } from '@/components/ui';
import { Funnel, ReceiptText, SearchX } from 'lucide-react';
import { ErrorState } from '@/components/ui/ErrorState/ErrorState';

function TransactionsContent() {
  const { transactions, isLoading, deleteTransaction, updateTransaction, isError } =
    useTransactions();
  const { filters, setFilters, clearFilters, filtered, isFilterVisible, setIsFilterVisible } =
    useTransactionFilters(transactions);

  const { showFeedback } = useFeedback();
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<Transaction | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  if (isError) {
    return <ErrorState />;
  }

  function handleDeleteRequest(id: string) {
    const transaction = transactions.find((t) => t.id === id) ?? null;
    setPendingDelete(transaction);
  }

  function handleEditRequest(id: string) {
    const transaction = transactions.find((t) => t.id === id) ?? null;
    setPendingEdit(transaction);
  }

  async function handleDeleteConfirm() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(pendingDelete.id);
      showFeedback({
        type: 'success',
        title: 'Transação excluída',
        message: 'A transação foi removida com sucesso.',
      });
      setPendingDelete(null);
    } catch {
      showFeedback({
        type: 'error',
        title: 'Erro ao excluir',
        message: 'Não foi possível excluir a transação. Tente novamente.',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleEditConfirm(data: TransactionFormValues) {
    if (!pendingEdit) return;
    setIsUpdating(true);
    try {
      await updateTransaction(pendingEdit.id, data);
      showFeedback({
        type: 'success',
        title: 'Transação atualizada',
        message: 'A transação foi atualizada com sucesso.',
      });
      setPendingEdit(null);
    } catch {
      showFeedback({
        type: 'error',
        title: 'Erro ao atualizar',
        message: 'Não foi possível atualizar a transação. Tente novamente.',
      });
    } finally {
      setIsUpdating(false);
    }
  }

  function handleDeleteCancel() {
    setPendingDelete(null);
  }

  function handleEditCancel() {
    setPendingEdit(null);
  }

  function renderEmptyState() {
    // Diferenciar entre "sem transações" e "filtros não encontraram resultados"
    if (transactions.length > 0 && filtered.length === 0) {
      return (
        <EmptyState
          icon={<SearchX size={32} />}
          title="Nenhuma transação encontrada"
          description="Tente ajustar seus filtros para ver mais resultados."
        />
      );
    }

    return (
      <EmptyState
        icon={<ReceiptText size={32} />}
        title="Nenhuma transação registrada"
        description="Registre sua primeira transação!"
        className="border border-gray-300 bg-white"
      />
    );
  }

  return (
    <>
      <section aria-labelledby="transactions-heading" className="flex flex-col gap-lg h-full px-1">
        <div className="sticky top-0 flex flex-col">
          <h1
            id="transactions-heading"
            className="py-lg w-full heading text-content-primary bg-background z-20 text-xl flex justify-between items-center"
          >
            Transações
            <IconButton
              icon={<Funnel />}
              aria-label="Adicionar filtros"
              className="sm:hidden"
              onClick={() => setIsFilterVisible(!isFilterVisible)}
            />
          </h1>
          <div
            className={`bg-background sm:block pb-lg ${isFilterVisible ? 'block filter-panel-in [animation:filter-panel-in_0.2s_ease-out]' : 'hidden'}`}
          >
            <TransactionFilters value={filters} onChange={setFilters} onClear={clearFilters} />
          </div>
        </div>
        <TransactionList
          transactions={filtered}
          isLoading={isLoading}
          onEdit={handleEditRequest}
          onDelete={handleDeleteRequest}
          emptyState={renderEmptyState()}
          className="w-full overflow-y-auto h-full"
        />
      </section>
      <DeleteTransactionModal
        transaction={pendingDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
      <EditTransactionModal
        transaction={pendingEdit}
        onConfirm={handleEditConfirm}
        onCancel={handleEditCancel}
        isSubmitting={isUpdating}
      />
    </>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<SkeletonList lines={5} />}>
      <TransactionsContent />
    </Suspense>
  );
}
