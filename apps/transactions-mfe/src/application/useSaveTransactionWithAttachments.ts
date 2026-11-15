import { useCallback, useMemo } from 'react';
import { useCreateTransaction } from '@bytebank/api-client';
import { uploadTransactionAttachments } from './use-cases/saveTransactionWithAttachments';
import { useUploadQueue } from './useUploadQueue';

export function useSaveTransactionWithAttachments() {
  const { mutateAsync: save } = useCreateTransaction();
  const queue = useUploadQueue();
  const { uploadFiles, reconcile, resetUploads } = queue;

  const upload = useMemo(
    () =>
      uploadTransactionAttachments({
        uploadFiles: async (id, files, onProgress) => {
          let settled = 0;
          const result = await uploadFiles(id, files, (event) => {
            if (event.type === 'done' || event.type === 'failed' || event.type === 'cancelled')
              onProgress?.(++settled);
          });
          return {
            succeededFiles: result.succeededFiles,
            failedFiles: result.failedFiles,
            cancelledFiles: result.cancelledFiles,
          };
        },
        reconcile: (id) => reconcile(id),
      }),
    [reconcile, uploadFiles]
  );

  const uploadAttachments = useCallback(
    (transactionId: string, files: File[], onProgress?: (done: number) => void) => {
      resetUploads();
      return upload(transactionId, files, onProgress);
    },
    [resetUploads, upload]
  );

  return { save, uploadAttachments, ...queue };
}
