'use client';

import { ConfirmTransactionModal } from '@/components/features/ConfirmTransactionModal';
import { Card } from '@/components/ui/Card';
import { useFeedback } from '@/context/FeedbackContext';
import { useTransactions } from '@/context/TransactionsContext';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import type {
  TransactionFormRef,
  TransactionFormValues,
} from '../TransactionForm/ITransactionForm';
import { TransactionForm } from '../TransactionForm/TransactionForm';

const SUCCESS_FEEDBACK = {
  type: 'success' as const,
  title: 'Transação adicionada!',
  message: 'Seu extrato foi atualizado.',
};
const ERROR_FEEDBACK = {
  type: 'error' as const,
  title: 'Erro ao adicionar transação',
  message: 'Tente novamente',
};

export function NewTransaction(): ReactElement {
  const { addTransaction } = useTransactions();
  const { showFeedback } = useFeedback();

  const formRef = useRef<TransactionFormRef>(null);
  const [pendingData, setPendingData] = useState<TransactionFormValues | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = (data: TransactionFormValues): void => {
    setPendingData(data);
  };

  const handleConfirm = async (): Promise<void> => {
    if (!pendingData) return;

    setIsSubmitting(true);

    try {
      await addTransaction(pendingData);
      setPendingData(null);
      formRef.current?.reset();
      showFeedback(SUCCESS_FEEDBACK);
    } catch {
      setPendingData(null);
      showFeedback(ERROR_FEEDBACK);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = (): void => {
    setPendingData(null);
  };

  return (
    <>
      <Card padding="lg" className="rounded-default bg-surface shadow-card">
        <h2 className="heading text-content-primary mb-lg">Nova transação</h2>

        <TransactionForm
          ref={formRef}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </Card>

      <ConfirmTransactionModal
        isOpen={pendingData !== null}
        transaction={pendingData}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
