import { useMemo } from 'react';
import { useCreateTransaction, useUploadAttachment } from '@bytebank/api-client';
import { saveTransactionWithAttachments } from './use-cases/saveTransactionWithAttachments';

export function useSaveTransactionWithAttachments() {
  const { mutateAsync: create } = useCreateTransaction();
  const { mutateAsync: upload } = useUploadAttachment();

  return useMemo(
    () =>
      saveTransactionWithAttachments({
        transactions: { create },
        attachments: { upload: (id, file) => upload({ id, file }) },
      }),
    [create, upload]
  );
}
