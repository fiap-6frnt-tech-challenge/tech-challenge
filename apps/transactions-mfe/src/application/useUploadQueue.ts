import { useCallback, useEffect, useRef, useState } from 'react';
import { ReplaySubject, Subscription } from 'rxjs';
import { useUploadAttachment } from '@bytebank/api-client';
import type { Attachment } from '@bytebank/core';
import { uploadQueue$, type UploadQueueEvent, type UploadQueueJob } from './uploadQueue';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'failed' | 'cancelled';

export interface UploadItemState {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: unknown;
}

export interface UploadBatchResult {
  succeededFiles: File[];
  failedFiles: File[];
  cancelledFiles: File[];
  unresolvedUploads: UploadItemState[];
}

const RETRYABLE_STATUSES = new Set<UploadStatus>(['queued', 'uploading', 'failed', 'cancelled']);

function progressPercent(loaded: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
}

export function useUploadQueue() {
  const { uploadStream, reconcileAttachments } = useUploadAttachment();
  const [uploads, setUploads] = useState<UploadItemState[]>([]);
  const uploadsRef = useRef(uploads);
  const nextId = useRef(0);
  const cancelSignals = useRef(new Map<string, ReplaySubject<void>>());
  const activeSubscriptions = useRef(new Set<Subscription>());

  const updateUploads = useCallback((update: (current: UploadItemState[]) => UploadItemState[]) => {
    const next = update(uploadsRef.current);
    uploadsRef.current = next;
    setUploads(next);
  }, []);

  const startJobs = useCallback(
    (transactionId: string, jobs: UploadQueueJob[]): Promise<UploadBatchResult> =>
      new Promise((resolve) => {
        if (jobs.length === 0) {
          resolve({
            succeededFiles: [],
            failedFiles: [],
            cancelledFiles: [],
            unresolvedUploads: [],
          });
          return;
        }

        const holder = new Subscription();
        activeSubscriptions.current.add(holder);

        const finish = () => {
          activeSubscriptions.current.delete(holder);
          const states = jobs
            .map((job) => uploadsRef.current.find((item) => item.id === job.id))
            .filter((item): item is UploadItemState => item !== undefined);
          resolve({
            succeededFiles: states
              .filter((item) => item.status === 'done')
              .map((item) => item.file),
            failedFiles: states.filter((item) => item.status === 'failed').map((item) => item.file),
            cancelledFiles: states
              .filter((item) => item.status === 'cancelled')
              .map((item) => item.file),
            unresolvedUploads: uploadsRef.current.filter((item) =>
              RETRYABLE_STATUSES.has(item.status)
            ),
          });
        };

        holder.add(
          uploadQueue$(jobs, (file) => uploadStream(transactionId, file)).subscribe({
            next: (event) => {
              updateUploads((current) => applyQueueEvent(current, event));
              if (event.type === 'done' || event.type === 'failed' || event.type === 'cancelled') {
                cancelSignals.current.delete(event.id);
              }
            },
            error: (error: unknown) => {
              updateUploads((current) =>
                current.map((item) =>
                  jobs.some((job) => job.id === item.id) && RETRYABLE_STATUSES.has(item.status)
                    ? { ...item, status: 'failed', error }
                    : item
                )
              );
              finish();
            },
            complete: finish,
          })
        );
      }),
    [updateUploads, uploadStream]
  );

  const uploadFiles = useCallback(
    (transactionId: string, files: File[]) => {
      if (!transactionId) throw new Error('Transação não encontrada para envio do anexo');
      const jobs = files.map((file) => {
        const id = `upload-${Date.now().toString(36)}-${nextId.current++}`;
        const cancel$ = new ReplaySubject<void>(1);
        cancelSignals.current.set(id, cancel$);
        return { id, file, cancel$ };
      });

      updateUploads((current) => [
        ...current.filter((item) => item.status !== 'done'),
        ...jobs.map(({ id, file }) => ({ id, file, progress: 0, status: 'queued' as const })),
      ]);
      return startJobs(transactionId, jobs);
    },
    [startJobs, updateUploads]
  );

  const cancelUpload = useCallback((id: string) => {
    const signal = cancelSignals.current.get(id);
    if (!signal) return;
    signal.next();
    signal.complete();
  }, []);

  const cancelAllUploads = useCallback(() => {
    for (const id of cancelSignals.current.keys()) cancelUpload(id);
  }, [cancelUpload]);

  const retryUpload = useCallback(
    (id: string, transactionId: string) => {
      const item = uploadsRef.current.find((upload) => upload.id === id);
      if (!item || !['failed', 'cancelled'].includes(item.status)) {
        return Promise.resolve({
          succeededFiles: [],
          failedFiles: [],
          cancelledFiles: [],
          unresolvedUploads: uploadsRef.current.filter((upload) =>
            RETRYABLE_STATUSES.has(upload.status)
          ),
        });
      }

      const cancel$ = new ReplaySubject<void>(1);
      cancelSignals.current.set(id, cancel$);
      updateUploads((current) =>
        current.map((upload) =>
          upload.id === id ? { ...upload, progress: 0, status: 'queued', error: undefined } : upload
        )
      );
      return startJobs(transactionId, [{ id, file: item.file, cancel$ }]);
    },
    [startJobs, updateUploads]
  );

  const reconcile = useCallback(
    (transactionId: string): Promise<Attachment[]> => reconcileAttachments(transactionId),
    [reconcileAttachments]
  );

  const resetUploads = useCallback(() => {
    cancelAllUploads();
    uploadsRef.current = [];
    setUploads([]);
  }, [cancelAllUploads]);

  const markAlreadyUploaded = useCallback(
    (files: File[]) => {
      const resolved = new Set(files);
      updateUploads((current) =>
        current.map((item) =>
          resolved.has(item.file) && (item.status === 'failed' || item.status === 'cancelled')
            ? { ...item, status: 'done', progress: 100, error: undefined }
            : item
        )
      );
    },
    [updateUploads]
  );

  useEffect(
    () => () => {
      activeSubscriptions.current.forEach((subscription) => subscription.unsubscribe());
      activeSubscriptions.current.clear();
      cancelSignals.current.forEach((signal) => signal.complete());
      cancelSignals.current.clear();
    },
    []
  );

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

function applyQueueEvent(current: UploadItemState[], event: UploadQueueEvent): UploadItemState[] {
  return current.map((item) => {
    if (item.id !== event.id) return item;
    switch (event.type) {
      case 'started':
        return { ...item, status: 'uploading', error: undefined };
      case 'progress':
        return {
          ...item,
          status: 'uploading',
          progress: progressPercent(event.loaded, event.total),
        };
      case 'done':
        return { ...item, status: 'done', progress: 100, error: undefined };
      case 'failed':
        return { ...item, status: 'failed', error: event.error };
      case 'cancelled':
        return { ...item, status: 'cancelled' };
    }
  });
}
