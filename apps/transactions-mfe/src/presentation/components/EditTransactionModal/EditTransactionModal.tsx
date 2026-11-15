'use client';

import { useEffect, useState } from 'react';
import { AttachmentList, FileUpload, Modal } from '@bytebank/design-system';
import { showFeedback, useAppDispatch, ClientSessionEndedError } from '@bytebank/stores';
import { EditTransactionModalProps } from './IEditTransactionModal';
import { ConfirmTransactionModal } from '../ConfirmTransactionModal';
import { TransactionForm } from '../TransactionForm/TransactionForm';
import type { TransactionFormValues } from '../TransactionForm/ITransactionForm';
import { TransactionFlowStatus } from '../TransactionFlowStatus';
import { useAttachments } from '../../../application/useAttachments';
import { useTransactionFlow } from '../../../application/useTransactionFlow';

export function EditTransactionModal({ transaction, onSave, onClose }: EditTransactionModalProps) {
  const dispatch = useAppDispatch();
  const transactionId = transaction?.id;
  const [hasAttachmentChanges, setHasAttachmentChanges] = useState(false);
  const {
    uploadedAttachments,
    removing,
    isLoading,
    isUploading,
    uploads,
    loadAttachments,
    uploadFiles,
    cancelUpload,
    retryUpload,
    cancelAllUploads,
    removeAttachment,
    resetAttachments,
  } = useAttachments(transactionId);
  const { state, send } = useTransactionFlow<TransactionFormValues>({
    save: onSave,
    onFinish: () => {
      cancelAllUploads();
      onClose();
    },
  });
  const isConfirmOpen =
    state.value === 'confirming' || state.value === 'saving' || state.value === 'error';
  const isSaving = state.value === 'saving';

  useEffect(() => {
    setHasAttachmentChanges(false);

    if (!transactionId) {
      resetAttachments();
      return;
    }

    void loadAttachments(transactionId).catch((error: unknown) => {
      if (error instanceof ClientSessionEndedError) return;
      dispatch(
        showFeedback({
          type: 'error',
          title: 'Erro ao carregar anexos',
          message: 'Tente abrir a transação novamente.',
        })
      );
    });
  }, [dispatch, loadAttachments, resetAttachments, transactionId]);

  const handleUpload = async (files: File[]) => {
    if (!transactionId) return;

    try {
      const result = await uploadFiles(files, transactionId);
      if (result.succeededFiles.length > 0) setHasAttachmentChanges(true);
      if (result.failedFiles.length > 0 || result.cancelledFiles.length > 0) {
        dispatch(
          showFeedback({
            type: 'info',
            title: 'Alguns anexos ficaram pendentes',
            message: 'Os arquivos continuam disponíveis para tentar novamente.',
          })
        );
      }
    } catch (error) {
      if (error instanceof ClientSessionEndedError) return;
      dispatch(
        showFeedback({
          type: 'error',
          title: 'Erro ao enviar anexo',
          message: 'Tente novamente.',
        })
      );
    }
  };

  const handleRetryUpload = async (uploadId: string) => {
    if (!transactionId) return;

    try {
      const result = await retryUpload(uploadId, transactionId);
      if (result.succeededFiles.length > 0) setHasAttachmentChanges(true);
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

  const handleRemove = async (attachmentId: string) => {
    if (!transactionId) return;

    try {
      await removeAttachment(attachmentId, transactionId);
      setHasAttachmentChanges(true);
    } catch (error) {
      if (error instanceof ClientSessionEndedError) return;
      dispatch(
        showFeedback({
          type: 'error',
          title: 'Erro ao remover anexo',
          message: 'Tente novamente.',
        })
      );
    }
  };

  return (
    <>
      <Modal
        isOpen={!!transaction}
        onClose={() => {
          if (!isConfirmOpen) send({ type: 'CANCEL' });
        }}
        title="Editar Transação"
      >
        <TransactionForm
          onSubmit={(draft) => send({ type: 'SUBMIT', draft, files: [] })}
          initialValues={transaction || undefined}
          isSubmitting={isSaving}
          hasExternalChanges={hasAttachmentChanges}
          attachmentSlot={
            <div className="flex flex-col gap-sm">
              <p className="body-semibold text-content-primary">Anexos</p>
              {isLoading ? (
                <p className="label-default text-content-secondary">Carregando anexos...</p>
              ) : (
                <AttachmentList
                  attachments={uploadedAttachments}
                  uploadItems={uploads.filter((item) => item.status !== 'done')}
                  onRemove={handleRemove}
                  onCancel={cancelUpload}
                  onRetry={(id) => void handleRetryUpload(id)}
                  isRemoving={removing}
                />
              )}
              <FileUpload
                value={[]}
                onChange={handleUpload}
                onError={(title) => dispatch(showFeedback({ type: 'error', title }))}
                maxFiles={Math.max(
                  0,
                  5 -
                    uploadedAttachments.length -
                    uploads.filter((item) => item.status !== 'done').length
                )}
                disabled={isSaving || isUploading || uploadedAttachments.length >= 5}
              />
            </div>
          }
        />
      </Modal>

      <ConfirmTransactionModal
        mode="edit"
        isOpen={!!transaction && isConfirmOpen}
        transaction={isConfirmOpen ? state.draft : null}
        onConfirm={() => send({ type: 'CONFIRM' })}
        onCancel={() => send({ type: 'BACK' })}
        onRetry={() => send({ type: 'RETRY' })}
        error={state.value === 'error' ? state.reason : null}
        isSubmitting={isSaving}
      />

      <TransactionFlowStatus state={state} mode="edit" />
    </>
  );
}
