import { useCallback, useState } from 'react';
import { AttachmentService } from '@bytebank/api-client';
import type { Attachment } from '@bytebank/shared';

export interface FlushPendingResult {
  uploaded: Attachment[];
  failed: File[];
}

export function useAttachments(transactionId?: string) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  const loadAttachments = useCallback(
    async (id = transactionId) => {
      if (!id) {
        setUploadedAttachments([]);
        return;
      }

      setIsLoading(true);
      try {
        const attachments = await AttachmentService.list(id);
        setUploadedAttachments(attachments);
      } finally {
        setIsLoading(false);
      }
    },
    [transactionId]
  );

  const uploadFile = useCallback(
    async (file: File, id = transactionId) => {
      if (!id) throw new Error('Transação não encontrada para envio do anexo');

      setUploadingCount((count) => count + 1);
      try {
        const attachment = await AttachmentService.upload(id, file);
        setUploadedAttachments((current) => [...current, attachment]);
        return attachment;
      } finally {
        setUploadingCount((count) => Math.max(0, count - 1));
      }
    },
    [transactionId]
  );

  const uploadFiles = useCallback(
    async (files: File[], id = transactionId) =>
      Promise.all(files.map((file) => uploadFile(file, id))),
    [transactionId, uploadFile]
  );

  const removeAttachment = useCallback(
    async (attachmentId: string, id = transactionId) => {
      if (!id) throw new Error('Transação não encontrada para remover o anexo');

      setRemoving(attachmentId);
      try {
        await AttachmentService.remove(id, attachmentId);
        setUploadedAttachments((current) =>
          current.filter((attachment) => attachment.id !== attachmentId)
        );
      } finally {
        setRemoving(null);
      }
    },
    [transactionId]
  );

  const flushPending = useCallback(
    async (id: string): Promise<FlushPendingResult> => {
      const files = pendingFiles;
      const results = await Promise.allSettled(files.map((file) => uploadFile(file, id)));
      const uploaded = results.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : []
      );
      const failed = files.filter((_, index) => results[index].status === 'rejected');

      setPendingFiles(failed);
      return { uploaded, failed };
    },
    [pendingFiles, uploadFile]
  );

  const resetAttachments = useCallback(() => {
    setPendingFiles([]);
    setUploadedAttachments([]);
    setRemoving(null);
  }, []);

  return {
    pendingFiles,
    setPendingFiles,
    uploadedAttachments,
    removing,
    isLoading,
    isUploading: uploadingCount > 0,
    loadAttachments,
    uploadFiles,
    removeAttachment,
    flushPending,
    resetAttachments,
  };
}
