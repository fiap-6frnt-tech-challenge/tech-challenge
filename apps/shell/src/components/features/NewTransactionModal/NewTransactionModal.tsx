'use client';

import { ConfirmTransactionModal } from '@/components/features/ConfirmTransactionModal';
import { Modal } from '@bytebank/design-system';
import { useCreateTransaction } from '@bytebank/api-client';
import { showFeedback, useAppDispatch } from '@bytebank/stores';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import type {
  TransactionFormRef,
  TransactionFormValues,
} from '../TransactionForm/ITransactionForm';
import { TransactionForm } from '../TransactionForm/TransactionForm';
import type { NewTransactionModalProps } from './INewTransactionModal';

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

const DEFAULT_USER_ID = 'joana';
const DEFAULT_CATEGORY = 'default';

export function NewTransactionModal({ isOpen, onCancel }: NewTransactionModalProps): ReactElement {
  const { mutateAsync: createTransaction } = useCreateTransaction();
  const dispatch = useAppDispatch();

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
      await createTransaction({
        ...pendingData,
        userId: DEFAULT_USER_ID,
        category: DEFAULT_CATEGORY,
        attachments: [],
      });

      setPendingData(null);
      formRef.current?.reset();

      dispatch(showFeedback(SUCCESS_FEEDBACK));

      onCancel();
    } catch {
      setPendingData(null);
      dispatch(showFeedback(ERROR_FEEDBACK));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = (): void => {
    setPendingData(null);
    onCancel();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleCancel} title="Nova transação">
        <TransactionForm
          ref={formRef}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </Modal>

      <ConfirmTransactionModal
        isOpen={pendingData !== null}
        transaction={pendingData}
        onConfirm={handleConfirm}
        onCancel={() => setPendingData(null)}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
