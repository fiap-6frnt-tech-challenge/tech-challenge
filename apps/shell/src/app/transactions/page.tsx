'use client';

import { TransactionFilters } from '@/components/features/TransactionFilters';
import type { TransactionFormValues } from '@/components/features/TransactionForm/ITransactionForm';
import { TransactionList } from '@/components/features/TransactionList';
import { EmptyState, IconButton, Pagination } from '@/components/ui';
import { ErrorState } from '@/components/ui/ErrorState/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useFeedback } from '@/context/FeedbackContext';
import { useTransactions } from '@/context/TransactionsContext';
import { usePaginatedTransactions, useTransactionFilters } from '@/hooks';
import { DEFAULT_FILTERS } from '@/components/features/TransactionFilters';
import type { Transaction } from '@/types';
import { Funnel, ReceiptText, SearchX } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Suspense, useState } from 'react';

const DeleteTransactionModal = dynamic(
  () =>
    import('@/components/features/DeleteTransactionModal').then((m) => m.DeleteTransactionModal),
  { ssr: false }
);
const EditTransactionModal = dynamic(
  () => import('@/components/features/EditTransactionModal').then((m) => m.EditTransactionModal),
  { ssr: false }
);

function TransactionsContent() {
  const { deleteTransaction, updateTransaction } = useTransactions();
  const { filters, setFilters, clearFilters, page, setPage, isFilterVisible, setIsFilterVisible } =
    useTransactionFilters();
  const { transactions, totalPages, isLoading, isError, refetch } = usePaginatedTransactions(
    filters,
    page
  );

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
      await refetch();
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
      await refetch();
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

  const hasActiveFilters =
    filters.type !== DEFAULT_FILTERS.type || !!filters.dateFrom || !!filters.dateTo;

  function renderEmptyState() {
    if (hasActiveFilters) {
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
      <section
        aria-labelledby="transactions-heading"
        className="flex flex-col gap-lg overflow-hidden h-full px-1"
      >
        <div className="flex flex-col">
          <h1
            id="transactions-heading"
            className="py-lg w-full heading text-content-primary bg-background text-xl flex justify-between items-center"
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
          transactions={transactions}
          isLoading={isLoading}
          onEdit={handleEditRequest}
          onDelete={handleDeleteRequest}
          emptyState={renderEmptyState()}
          className="w-full overflow-y-auto flex-1 min-h-0"
        />
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
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
