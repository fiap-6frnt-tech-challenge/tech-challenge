import { useMemo } from 'react';
import { useCreateTransaction } from '@bytebank/api-client';
import { saveTransactionWithAttachments } from './use-cases/saveTransactionWithAttachments';
import { useUploadQueue } from './useUploadQueue';

export function useSaveTransactionWithAttachments() {
  const { mutateAsync: create } = useCreateTransaction();
  const queue = useUploadQueue();
  const { uploadFiles, reconcile } = queue;

  const saveTransaction = useMemo(
    () =>
      saveTransactionWithAttachments({
        transactions: { create },
        attachments: {
          uploadFiles: async (id, files) => {
            const result = await uploadFiles(id, files);
            return {
              succeededFiles: result.succeededFiles,
              failedFiles: result.failedFiles,
              cancelledFiles: result.cancelledFiles,
            };
          },
          reconcile: (id) => reconcile(id),
        },
      }),
    [create, reconcile, uploadFiles]
  );

  return { saveTransaction, ...queue };
}
