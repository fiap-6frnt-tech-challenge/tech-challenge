'use client';

import { ConfirmTransactionModal } from '../ConfirmTransactionModal';
import { AttachmentList, Button, FileUpload, Modal } from '@bytebank/design-system';
import { showFeedback, useAppDispatch } from '@bytebank/stores';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { TransactionFormValues } from '../TransactionForm/ITransactionForm';
import { TransactionForm } from '../TransactionForm/TransactionForm';
import { TransactionFlowStatus } from '../TransactionFlowStatus';
import { useSaveTransactionWithAttachments } from '../../../application/useSaveTransactionWithAttachments';
import { useTransactionFlow } from '../../../application/useTransactionFlow';
import type { NewTransactionModalProps } from './INewTransactionModal';

export function NewTransactionModal({ isOpen, onCancel }: NewTransactionModalProps): ReactElement {
  const { save, uploadAttachments, uploads, cancelUpload, cancelAllUploads, resetUploads } =
    useSaveTransactionWithAttachments();
  const dispatch = useAppDispatch();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const { state, send } = useTransactionFlow<TransactionFormValues>({
    save,
    uploadAttachments,
    cancelUploads: cancelAllUploads,
    onFinish: () => {
      resetUploads();
      setPendingFiles([]);
      onCancel();
    },
  });

  const isConfirmOpen =
    state.value === 'confirming' || state.value === 'saving' || state.value === 'error';
  const canDismiss = !isConfirmOpen && state.value !== 'uploading';
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.value === 'uploading' || state.value === 'partialSuccess') panelRef.current?.focus();
  }, [state.value]);

  const uploadItemsFor = (files: File[]) => uploads.filter((item) => files.includes(item.file));

  const renderBody = () => {
    if (state.value === 'uploading') {
      return (
        <div ref={panelRef} tabIndex={-1} className="flex flex-col gap-md outline-none">
          <p className="body-default text-content-secondary">
            A transação foi criada. Enviando os anexos…
          </p>
          <div className="flex flex-col gap-xs">
            <div className="flex justify-between label-default text-content-secondary">
              <span>Anexos processados</span>
              <span className="tabular-nums">
                {state.done} de {state.total}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Envio dos anexos"
              aria-valuemin={0}
              aria-valuemax={state.total}
              aria-valuenow={state.done}
              aria-valuetext={`${state.done} de ${state.total} anexos processados`}
              className="h-1.5 w-full overflow-hidden rounded-full bg-background"
            >
              <div
                className="h-full rounded-full bg-brand-primary transition-all"
                style={{ width: `${(state.done / state.total) * 100}%` }}
              />
            </div>
          </div>
          <AttachmentList
            attachments={[]}
            uploadItems={uploadItemsFor(state.files)}
            onCancel={cancelUpload}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => send({ type: 'CANCEL' })}
              disabled={state.cancelling}
            >
              {state.cancelling ? 'Cancelando...' : 'Cancelar envio'}
            </Button>
          </div>
        </div>
      );
    }

    if (state.value === 'partialSuccess') {
      return (
        <div ref={panelRef} tabIndex={-1} className="flex flex-col gap-md outline-none">
          <p className="body-default text-content-secondary">
            A transação foi criada, mas{' '}
            {state.failed.length === 1
              ? '1 anexo não foi enviado'
              : `${state.failed.length} anexos não foram enviados`}
            . Tente de novo agora ou anexe depois pela edição da transação.
          </p>
          <AttachmentList attachments={[]} uploadItems={uploadItemsFor(state.failed)} />
          <div className="flex flex-col gap-sm sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => send({ type: 'CANCEL' })}>
              Fechar
            </Button>
            <Button type="button" onClick={() => send({ type: 'RETRY_FAILED' })}>
              Tentar de novo
            </Button>
          </div>
        </div>
      );
    }

    return (
      <TransactionForm
        onSubmit={(draft) => send({ type: 'SUBMIT', draft, files: pendingFiles })}
        isSubmitting={state.value === 'saving'}
        attachmentSlot={
          <div className="flex flex-col gap-sm">
            <p className="body-semibold text-content-primary">Anexos</p>
            <FileUpload
              value={pendingFiles}
              onChange={setPendingFiles}
              onError={(title) => dispatch(showFeedback({ type: 'error', title }))}
              maxFiles={5}
              disabled={state.value === 'saving'}
            />
            <p className="label-default text-content-secondary">
              Arquivos serão enviados após confirmar a transação.
            </p>
          </div>
        }
      />
    );
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (canDismiss) send({ type: 'CANCEL' });
        }}
        showCloseButton={state.value !== 'uploading'}
        title="Nova transação"
      >
        {renderBody()}
      </Modal>

      <ConfirmTransactionModal
        isOpen={isConfirmOpen}
        transaction={isConfirmOpen ? state.draft : null}
        onConfirm={() => send({ type: 'CONFIRM' })}
        onCancel={() => send({ type: 'BACK' })}
        onRetry={() => send({ type: 'RETRY' })}
        error={state.value === 'error' ? state.reason : null}
        isSubmitting={state.value === 'saving'}
      />

      <TransactionFlowStatus state={state} mode="create" />
    </>
  );
}
