'use client';

import { ConfirmTransactionModal } from '../ConfirmTransactionModal';
import { Button, FileUpload, Modal } from '@bytebank/design-system';
import { showFeedback, useAppDispatch, ClientSessionEndedError } from '@bytebank/stores';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import type {
  TransactionFormRef,
  TransactionFormValues,
} from '../TransactionForm/ITransactionForm';
import { TransactionForm } from '../TransactionForm/TransactionForm';
import { useSaveTransactionWithAttachments } from '../../../application/useSaveTransactionWithAttachments';
import type { NewTransactionModalProps } from './INewTransactionModal';

const ERROR_FEEDBACK = {
  type: 'error' as const,
  title: 'Erro ao adicionar transação',
  message: 'Tente novamente',
};

export function NewTransactionModal({ isOpen, onCancel }: NewTransactionModalProps): ReactElement {
  const { saveTransaction, uploads, isUploading, cancelUpload, retryUpload, resetUploads } =
    useSaveTransactionWithAttachments();
  const dispatch = useAppDispatch();

  const formRef = useRef<TransactionFormRef>(null);
  const [pendingData, setPendingData] = useState<TransactionFormValues | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [savedTransactionId, setSavedTransactionId] = useState<string | null>(null);

  const handleFormSubmit = (data: TransactionFormValues): void => {
    if (savedTransactionId) return;
    setPendingData(data);
  };

  const handleConfirm = async (): Promise<void> => {
    if (!pendingData || isSubmitting) return;

    const submittedData = pendingData;
    setPendingData(null);

    setIsSubmitting(true);

    try {
      const result = await saveTransaction(submittedData, pendingFiles);
      const retryableFiles = [...result.failedFiles, ...result.cancelledFiles];

      if (retryableFiles.length > 0) {
        setSavedTransactionId(result.transaction.id);
        setPendingFiles(retryableFiles);
        formRef.current?.reset();
        dispatch(
          showFeedback({
            type: 'info',
            title: 'Transação criada com anexos pendentes',
            message: 'Os arquivos que falharam permanecem disponíveis para tentar novamente.',
          })
        );
        return;
      }

      formRef.current?.reset();
      setPendingFiles([]);
      setSavedTransactionId(null);
      resetUploads();
      onCancel();
    } catch (error) {
      if (error instanceof ClientSessionEndedError) return;
      dispatch(showFeedback(ERROR_FEEDBACK));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryUpload = async (uploadId: string) => {
    if (!savedTransactionId) return;
    try {
      const result = await retryUpload(uploadId, savedTransactionId);
      setPendingFiles(result.unresolvedUploads.map((item) => item.file));
      if (result.unresolvedUploads.length === 0) {
        setSavedTransactionId(null);
        setPendingFiles([]);
        resetUploads();
        onCancel();
      }
    } catch (error) {
      if (error instanceof ClientSessionEndedError) return;
      dispatch(
        showFeedback({
          type: 'error',
          title: 'Erro ao tentar novamente',
          message: 'O arquivo continua disponível para nova tentativa.',
        })
      );
    }
  };

  const handleCancel = (): void => {
    if (isSubmitting) return;
    if (!savedTransactionId) {
      resetUploads();
      setPendingFiles([]);
    }
    setPendingData(null);
    onCancel();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleCancel} title="Nova transação">
        {savedTransactionId ? (
          <div className="flex flex-col gap-md">
            <p className="body-default text-content-secondary">
              A transação foi criada. Reenvie os anexos pendentes ou feche e volte a esta tela
              depois.
            </p>
            <FileUpload
              value={pendingFiles}
              uploadItems={uploads.filter((item) => pendingFiles.includes(item.file))}
              onChange={setPendingFiles}
              onCancel={cancelUpload}
              onRetry={(id) => void handleRetryUpload(id)}
              onError={(title) => dispatch(showFeedback({ type: 'error', title }))}
              maxFiles={5}
              disabled={isSubmitting || savedTransactionId !== null}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
                disabled={isUploading}
              >
                Fechar
              </Button>
            </div>
          </div>
        ) : (
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
                  uploadItems={uploads.filter((item) => pendingFiles.includes(item.file))}
                  onChange={setPendingFiles}
                  onCancel={cancelUpload}
                  onRetry={(id) => void handleRetryUpload(id)}
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
        )}
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
