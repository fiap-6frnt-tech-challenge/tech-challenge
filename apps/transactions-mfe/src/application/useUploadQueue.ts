import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ReplaySubject, Subscription } from 'rxjs';
import { useUploadAttachment } from '@bytebank/api-client';
import type { Attachment } from '@bytebank/core';
import {
  registerUploadCancellation,
  selectAllUploads,
  uploadQueued,
  uploadStarted,
  uploadProgress,
  uploadCompleted,
  uploadFailed,
  uploadCancelled,
  uploadsRemoved,
  useAppSelector,
  useAppStore,
  type UploadMetadata,
  type UploadStatus,
} from '@bytebank/stores';
import { uploadQueue$, type UploadQueueEvent, type UploadQueueJob } from './uploadQueue';
import { UploadSessionEndedError } from './uploadSession';

export type { UploadStatus } from '@bytebank/stores';
export interface UploadItemState {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
}
export interface UploadBatchResult {
  succeededFiles: File[];
  failedFiles: File[];
  cancelledFiles: File[];
  unresolvedUploads: UploadItemState[];
}
const RETRYABLE_STATUSES = new Set<UploadStatus>(['queued', 'uploading', 'failed', 'cancelled']);
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Não foi possível enviar o arquivo. Tente novamente.';

function ownUploads(metadata: UploadMetadata[], files: Map<string, File>): UploadItemState[] {
  return metadata.flatMap((item) => {
    const file = files.get(item.id);
    return file
      ? [
          {
            id: item.id,
            file,
            status: item.status,
            error: item.error,
            progress:
              item.status === 'done'
                ? 100
                : item.total <= 0
                  ? 0
                  : Math.round((item.loaded / item.total) * 100),
          },
        ]
      : [];
  });
}

export function useUploadQueue() {
  const { uploadStream, reconcileAttachments } = useUploadAttachment();
  const store = useAppStore();
  const metadata = useAppSelector(selectAllUploads);
  const files = useRef(new Map<string, File>());
  const sessionEnded = useRef(false);
  const cancelSignals = useRef(new Map<string, ReplaySubject<void>>());
  const activeBatches = useRef(
    new Set<{ subscription: Subscription; reject: (error: Error) => void }>()
  );
  const uploads = useMemo(() => ownUploads(metadata, files.current), [metadata]);
  const readUploads = useCallback(
    () => ownUploads(selectAllUploads(store.getState()), files.current),
    [store]
  );

  const removeUploads = useCallback(
    (ids: string[]) => {
      ids.forEach((id) => files.current.delete(id));
      store.dispatch(uploadsRemoved(ids));
    },
    [store]
  );
  const assertSessionActive = useCallback(() => {
    if (sessionEnded.current) throw new UploadSessionEndedError();
  }, []);

  const applyEvent = useCallback(
    (event: UploadQueueEvent) => {
      if (sessionEnded.current) return;
      switch (event.type) {
        case 'started':
          store.dispatch(uploadStarted(event.id));
          break;
        case 'progress':
          store.dispatch(
            uploadProgress({ id: event.id, loaded: event.loaded, total: event.total })
          );
          break;
        case 'done':
          store.dispatch(uploadCompleted(event.id));
          break;
        case 'failed':
          store.dispatch(uploadFailed({ id: event.id, message: errorMessage(event.error) }));
          break;
        case 'cancelled':
          store.dispatch(uploadCancelled(event.id));
          break;
      }
      if (event.type === 'done' || event.type === 'failed' || event.type === 'cancelled')
        cancelSignals.current.delete(event.id);
    },
    [store]
  );

  const startJobs = useCallback(
    (
      transactionId: string,
      jobs: UploadQueueJob[],
      onEvent?: (event: UploadQueueEvent) => void
    ): Promise<UploadBatchResult> =>
      new Promise((resolve, reject) => {
        if (sessionEnded.current) {
          reject(new UploadSessionEndedError());
          return;
        }
        const emit = (event: UploadQueueEvent) => {
          applyEvent(event);
          if (!sessionEnded.current) onEvent?.(event);
        };
        const batch = { subscription: new Subscription(), reject };
        activeBatches.current.add(batch);
        const finish = () => {
          activeBatches.current.delete(batch);
          if (sessionEnded.current) {
            reject(new UploadSessionEndedError());
            return;
          }
          const current = readUploads();
          const ids = new Set(jobs.map((job) => job.id));
          const states = current.filter((item) => ids.has(item.id));
          resolve({
            succeededFiles: states
              .filter((item) => item.status === 'done')
              .map((item) => item.file),
            failedFiles: states.filter((item) => item.status === 'failed').map((item) => item.file),
            cancelledFiles: states
              .filter((item) => item.status === 'cancelled')
              .map((item) => item.file),
            unresolvedUploads: current.filter((item) => RETRYABLE_STATUSES.has(item.status)),
          });
        };
        batch.subscription.add(
          uploadQueue$(jobs, (file) => uploadStream(transactionId, file)).subscribe({
            next: emit,
            error: (error: unknown) => {
              jobs.forEach((job) => emit({ type: 'failed', id: job.id, file: job.file, error }));
              finish();
            },
            complete: finish,
          })
        );
      }),
    [applyEvent, readUploads, uploadStream]
  );

  const uploadFiles = useCallback(
    (transactionId: string, nextFiles: File[], onEvent?: (event: UploadQueueEvent) => void) => {
      assertSessionActive();
      if (!transactionId) throw new Error('Transação não encontrada para envio do anexo');
      removeUploads(
        readUploads()
          .filter((item) => item.status === 'done')
          .map((item) => item.id)
      );
      const jobs = nextFiles.map((file) => {
        const id = crypto.randomUUID();
        const cancel$ = new ReplaySubject<void>(1);
        files.current.set(id, file);
        cancelSignals.current.set(id, cancel$);
        store.dispatch(
          uploadQueued({
            id,
            transactionId,
            fileName: file.name,
            loaded: 0,
            total: file.size,
            status: 'queued',
          })
        );
        return { id, file, cancel$ };
      });
      return startJobs(transactionId, jobs, onEvent);
    },
    [assertSessionActive, readUploads, removeUploads, startJobs, store]
  );

  const cancelUpload = useCallback((id: string) => {
    const signal = cancelSignals.current.get(id);
    signal?.next();
    signal?.complete();
  }, []);
  const cancelAllUploads = useCallback(() => {
    const current = readUploads();
    // Signal queued jobs first so dequeuing them cannot start an unwanted request.
    current.filter((item) => item.status === 'queued').forEach((item) => cancelUpload(item.id));
    current.filter((item) => item.status === 'uploading').forEach((item) => cancelUpload(item.id));
  }, [cancelUpload, readUploads]);
  const resetUploads = useCallback(() => {
    cancelAllUploads();
    removeUploads([...files.current.keys()]);
  }, [cancelAllUploads, removeUploads]);

  const retryUpload = useCallback(
    (id: string, transactionId: string) => {
      assertSessionActive();
      const item = readUploads().find((upload) => upload.id === id);
      if (!item || !['failed', 'cancelled'].includes(item.status))
        return Promise.resolve({
          succeededFiles: [],
          failedFiles: [],
          cancelledFiles: [],
          unresolvedUploads: readUploads().filter((upload) =>
            RETRYABLE_STATUSES.has(upload.status)
          ),
        });
      const cancel$ = new ReplaySubject<void>(1);
      cancelSignals.current.set(id, cancel$);
      store.dispatch(
        uploadQueued({
          id,
          transactionId,
          fileName: item.file.name,
          loaded: 0,
          total: item.file.size,
          status: 'queued',
          error: undefined,
        })
      );
      return startJobs(transactionId, [{ id, file: item.file, cancel$ }]);
    },
    [assertSessionActive, readUploads, startJobs, store]
  );

  const reconcile = useCallback(
    async (transactionId: string): Promise<Attachment[]> => {
      assertSessionActive();
      try {
        const result = await reconcileAttachments(transactionId);
        assertSessionActive();
        return result;
      } catch (error) {
        assertSessionActive();
        throw error;
      }
    },
    [assertSessionActive, reconcileAttachments]
  );
  const markAlreadyUploaded = useCallback(
    (resolvedFiles: File[]) => {
      readUploads()
        .filter(
          (item) =>
            resolvedFiles.includes(item.file) && ['failed', 'cancelled'].includes(item.status)
        )
        .forEach((item) => store.dispatch(uploadCompleted(item.id)));
    },
    [readUploads, store]
  );

  const endSession = useCallback(() => {
    sessionEnded.current = true;
    for (const batch of activeBatches.current) {
      batch.subscription.unsubscribe();
      batch.reject(new UploadSessionEndedError());
    }
    activeBatches.current.clear();
    cancelSignals.current.forEach((signal) => signal.complete());
    cancelSignals.current.clear();
    removeUploads([...files.current.keys()]);
  }, [removeUploads]);
  useEffect(() => {
    sessionEnded.current = false;
    const unregister = registerUploadCancellation(endSession);
    return () => {
      unregister();
      endSession();
    };
  }, [endSession]);

  return {
    uploads,
    isUploading: uploads.some((item) => item.status === 'queued' || item.status === 'uploading'),
    uploadFiles,
    cancelUpload,
    cancelAllUploads,
    retryUpload,
    reconcile,
    resetUploads,
    markAlreadyUploaded,
  };
}
