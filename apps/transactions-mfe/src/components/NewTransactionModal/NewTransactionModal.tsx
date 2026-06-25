'use client';

import { ConfirmTransactionModal } from '../ConfirmTransactionModal';
import { FileUpload, Modal } from '@bytebank/design-system';
import { useCreateTransaction } from '@bytebank/api-client';
import { showFeedback, useAppDispatch } from '@bytebank/stores';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import type {
  TransactionFormRef,
  TransactionFormValues,
} from '../TransactionForm/ITransactionForm';
import { TransactionForm } from '../TransactionForm/TransactionForm';
import { useAttachments } from '../../hooks/useAttachments';
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

export function NewTransactionModal({ isOpen, onCancel }: NewTransactionModalProps): ReactElement {
  const { mutateAsync: createTransaction } = useCreateTransaction();
  const dispatch = useAppDispatch();

  const formRef = useRef<TransactionFormRef>(null);
  const [pendingData, setPendingData] = useState<TransactionFormValues | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pendingFiles, setPendingFiles, flushPending, resetAttachments } = useAttachments();

  const handleFormSubmit = (data: TransactionFormValues): void => {
    setPendingData(data);
  };

  const handleConfirm = async (): Promise<void> => {
    if (!pendingData) return;

    setIsSubmitting(true);

    try {
      const createdTransaction = await createTransaction({
        ...pendingData,
        userId: DEFAULT_USER_ID,
        attachments: [],
      });
      const { failed } = await flushPending(createdTransaction.id);

      setPendingData(null);
      formRef.current?.reset();
      resetAttachments();

      dispatch(
        showFeedback(
          failed.length > 0
            ? {
                type: 'info',
                title: 'Transação criada com anexos pendentes',
                message:
                  'Alguns arquivos não foram enviados. Abra a transação para tentar novamente.',
              }
            : SUCCESS_FEEDBACK
        )
      );

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
    resetAttachments();
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
          attachmentSlot={
            <div className="flex flex-col gap-sm">
              <p className="body-semibold text-content-primary">Anexos</p>
              <FileUpload
                value={pendingFiles}
                onChange={setPendingFiles}
                onError={(title) => dispatch(showFeedback({ type: 'error', title }))}
                maxFiles={5}
                disabled={isSubmitting}
              />
              <p className="label-default text-content-secondary">
                Arquivos serão enviados após confirmar a transação.
              </p>
            </div>
          }
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
