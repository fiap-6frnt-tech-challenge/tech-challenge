'use client';

import { lazy, Suspense, useRef, useState } from 'react';
import { Funnel, ReceiptText, SearchX } from 'lucide-react';
import { EmptyState, ErrorState, IconButton, Pagination } from '@bytebank/design-system';
import {
  usePaginatedTransactions,
  useDeleteTransaction,
  useUpdateTransaction,
} from '@bytebank/api-client';
import { showFeedback, useAppDispatch } from '@bytebank/stores';
import type { Transaction } from '@bytebank/shared';
import { TransactionFilters, DEFAULT_FILTERS } from './components/TransactionFilters';
import { TransactionList } from './components/TransactionList';
import type { TransactionFormValues } from './components/TransactionForm/ITransactionForm';
import { useTransactionFilters } from './hooks/useTransactionFilters';

const DeleteTransactionModal = lazy(() =>
  import('./components/DeleteTransactionModal').then((m) => ({
    default: m.DeleteTransactionModal,
  }))
);
const EditTransactionModal = lazy(() =>
  import('./components/EditTransactionModal').then((m) => ({ default: m.EditTransactionModal }))
);

export default function TransactionsPage() {
  const { filters, setFilters, clearFilters, page, setPage, isFilterVisible, setIsFilterVisible } =
    useTransactionFilters();
  const {
    data: paginated,
    isLoading,
    isError,
    isPlaceholderData,
  } = usePaginatedTransactions({ page, ...filters });
  const transactions = paginated?.data ?? [];
  const totalPages = Math.max(1, paginated?.pages ?? 1);
  const listRef = useRef<HTMLDivElement>(null);

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const dispatch = useAppDispatch();
  const { mutateAsync: deleteTransaction } = useDeleteTransaction();
  const { mutateAsync: updateTransaction } = useUpdateTransaction();
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
      dispatch(
        showFeedback({
          type: 'success',
          title: 'Transação excluída',
          message: 'A transação foi removida com sucesso.',
        })
      );
      setPendingDelete(null);
    } catch {
      dispatch(
        showFeedback({
          type: 'error',
          title: 'Erro ao excluir',
          message: 'Não foi possível excluir a transação. Tente novamente.',
        })
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleEditConfirm(data: TransactionFormValues) {
    if (!pendingEdit) return;
    setIsUpdating(true);
    try {
      await updateTransaction({ id: pendingEdit.id, data });
      dispatch(
        showFeedback({
          type: 'success',
          title: 'Transação atualizada',
          message: 'A transação foi atualizada com sucesso.',
        })
      );
      setPendingEdit(null);
    } catch {
      dispatch(
        showFeedback({
          type: 'error',
          title: 'Erro ao atualizar',
          message: 'Não foi possível atualizar a transação. Tente novamente.',
        })
      );
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
    filters.type !== DEFAULT_FILTERS.type ||
    !!filters.dateFrom ||
    !!filters.dateTo ||
    !!filters.q ||
    filters.amount_gte !== undefined ||
    filters.amount_lte !== undefined ||
    filters.category.length > 0;

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
              onClick={() => setIsFilterVisible(!isFilterVisible)}
            />
          </h1>
          <TransactionFilters
            value={filters}
            onChange={setFilters}
            onClear={clearFilters}
            isFilterVisible={isFilterVisible}
          />
        </div>
        <TransactionList
          containerRef={listRef}
          transactions={transactions}
          isLoading={isLoading}
          isPlaceholderData={isPlaceholderData}
          onEdit={handleEditRequest}
          onDelete={handleDeleteRequest}
          emptyState={renderEmptyState()}
          className="w-full overflow-y-auto flex-1 min-h-0"
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          isBusy={isPlaceholderData}
        />
      </section>
      {pendingDelete && (
        <Suspense fallback={null}>
          <DeleteTransactionModal
            transaction={pendingDelete}
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
            isDeleting={isDeleting}
          />
        </Suspense>
      )}
      {pendingEdit && (
        <Suspense fallback={null}>
          <EditTransactionModal
            transaction={pendingEdit}
            onConfirm={handleEditConfirm}
            onCancel={handleEditCancel}
            isSubmitting={isUpdating}
          />
        </Suspense>
      )}
    </>
  );
}
