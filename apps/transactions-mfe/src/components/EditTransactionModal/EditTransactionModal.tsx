'use client';

import { useEffect } from 'react';
import { AttachmentList, FileUpload, Modal } from '@bytebank/design-system';
import { showFeedback, useAppDispatch } from '@bytebank/stores';
import { EditTransactionModalProps } from './IEditTransactionModal';
import { TransactionForm } from '../TransactionForm/TransactionForm';
import { useAttachments } from '../../hooks/useAttachments';

export function EditTransactionModal({
  transaction,
  onConfirm,
  onCancel,
  isSubmitting,
}: EditTransactionModalProps) {
  const dispatch = useAppDispatch();
  const transactionId = transaction?.id;
  const {
    uploadedAttachments,
    removing,
    isLoading,
    isUploading,
    loadAttachments,
    uploadFiles,
    removeAttachment,
    resetAttachments,
  } = useAttachments(transactionId);

  useEffect(() => {
    if (!transactionId) {
      resetAttachments();
      return;
    }

    void loadAttachments(transactionId).catch(() => {
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
      await uploadFiles(files, transactionId);
    } catch {
      dispatch(
        showFeedback({
          type: 'error',
          title: 'Erro ao enviar anexo',
          message: 'Tente novamente.',
        })
      );
    }
  };

  const handleRemove = async (attachmentId: string) => {
    if (!transactionId) return;

    try {
      await removeAttachment(attachmentId, transactionId);
    } catch {
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
    <Modal isOpen={!!transaction} onClose={onCancel} title="Editar Transação">
      <TransactionForm
        onSubmit={onConfirm}
        onCancel={onCancel}
        initialValues={transaction || undefined}
        isSubmitting={isSubmitting}
        attachmentSlot={
          <div className="flex flex-col gap-sm">
            <p className="body-semibold text-content-primary">Anexos</p>
            {isLoading ? (
              <p className="label-default text-content-secondary">Carregando anexos...</p>
            ) : (
              <AttachmentList
                attachments={uploadedAttachments}
                onRemove={handleRemove}
                isRemoving={removing}
              />
            )}
            <FileUpload
              value={[]}
              onChange={handleUpload}
              onError={(title) => dispatch(showFeedback({ type: 'error', title }))}
              maxFiles={Math.max(0, 5 - uploadedAttachments.length)}
              disabled={isSubmitting || isUploading || uploadedAttachments.length >= 5}
            />
          </div>
        }
      />
    </Modal>
  );
}
