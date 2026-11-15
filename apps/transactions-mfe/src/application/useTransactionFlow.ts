import { useEffect, useReducer, useRef } from 'react';
import { RateLimitedError, ValidationError } from '@bytebank/core';
import { ClientSessionEndedError } from '@bytebank/stores';
import { initialFlowState, transactionFlow, type FlowState } from './transactionFlow';

export interface FlowUploadResult {
  failedFiles: File[];
  cancelledFiles: File[];
}

export interface TransactionFlowOptions<D> {
  save: (draft: D) => Promise<{ id: string }>;
  uploadAttachments?: (
    transactionId: string,
    files: File[],
    onProgress: (done: number) => void
  ) => Promise<FlowUploadResult>;
  cancelUploads?: () => void;
  onFinish?: (outcome: 'success' | 'closed') => void;
}

export function useTransactionFlow<D>(options: TransactionFlowOptions<D>) {
  const [state, send] = useReducer(transactionFlow<D>, initialFlowState as FlowState<D>);
  const latest = useRef(options);
  const runRef = useRef<unknown>(null);

  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    if (state.value !== 'saving' || runRef.current === state) return;
    const run = state;
    runRef.current = run;
    latest.current.save(run.draft).then(
      (saved) => {
        if (runRef.current === run) send({ type: 'SAVED', transactionId: saved.id });
      },
      (error: unknown) => {
        if (runRef.current !== run) return;
        send(
          error instanceof ClientSessionEndedError
            ? { type: 'RESET' }
            : { type: 'FAILED', reason: failureReason(error) }
        );
      }
    );
  }, [state]);

  useEffect(() => {
    if (state.value !== 'uploading' || runRef.current === state.files) return;
    const run = state.files;
    runRef.current = run;
    const upload = latest.current.uploadAttachments;
    if (!upload) {
      send({ type: 'UPLOADS_DONE', failed: run });
      return;
    }
    upload(state.transactionId, run, (done) => {
      if (runRef.current === run) send({ type: 'PROGRESS', done });
    }).then(
      ({ failedFiles, cancelledFiles }) => {
        if (runRef.current === run)
          send({ type: 'UPLOADS_DONE', failed: [...failedFiles, ...cancelledFiles] });
      },
      (error: unknown) => {
        if (runRef.current !== run) return;
        send(
          error instanceof ClientSessionEndedError
            ? { type: 'RESET' }
            : { type: 'UPLOADS_DONE', failed: run }
        );
      }
    );
  }, [state]);

  const isCancelling = state.value === 'uploading' && state.cancelling;
  useEffect(() => {
    if (isCancelling) latest.current.cancelUploads?.();
  }, [isCancelling]);

  useEffect(() => {
    if (state.value !== 'success' && state.value !== 'closed') return;
    latest.current.onFinish?.(state.value);
    send({ type: 'RESET' });
  }, [state]);

  return { state, send };
}

function failureReason(error: unknown): string {
  if (error instanceof ValidationError)
    return 'O servidor recusou os dados. Revise o formulário e tente de novo.';
  if (error instanceof RateLimitedError)
    return 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.';
  return 'Não foi possível salvar agora. Tente de novo.';
}
