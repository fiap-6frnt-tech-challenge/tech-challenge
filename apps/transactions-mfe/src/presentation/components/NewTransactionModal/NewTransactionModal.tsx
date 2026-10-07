'use client';

import { ConfirmTransactionModal } from '../ConfirmTransactionModal';
import { FileUpload, Modal } from '@bytebank/design-system';
import { showFeedback, useAppDispatch } from '@bytebank/stores';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import type {
  TransactionFormRef,
  TransactionFormValues,
} from '../TransactionForm/ITransactionForm';
import { TransactionForm } from '../TransactionForm/TransactionForm';
import { useSaveTransactionWithAttachments } from '../../../application/useSaveTransactionWithAttachments';
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

export function NewTransactionModal({ isOpen, onCancel }: NewTransactionModalProps): ReactElement {
  const saveTransaction = useSaveTransactionWithAttachments();
  const dispatch = useAppDispatch();

  const formRef = useRef<TransactionFormRef>(null);
  const [pendingData, setPendingData] = useState<TransactionFormValues | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const handleFormSubmit = (data: TransactionFormValues): void => {
    setPendingData(data);
  };

  const handleConfirm = async (): Promise<void> => {
    if (!pendingData) return;

    setIsSubmitting(true);

    try {
      const { failedFiles } = await saveTransaction(pendingData, pendingFiles);

      setPendingData(null);
      formRef.current?.reset();
      setPendingFiles([]);

      dispatch(
        showFeedback(
          failedFiles.length > 0
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
    setPendingFiles([]);
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
