import { useCallback, useState } from 'react';
import { AttachmentService } from '@bytebank/api-client';
import type { Attachment } from '@bytebank/core';
import { useUploadQueue, type UploadBatchResult } from './useUploadQueue';
import { UploadSessionEndedError } from './uploadSession';

export function useAttachments(transactionId?: string) {
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const {
    isUploading,
    uploads,
    uploadFiles: startUploads,
    cancelUpload,
    retryUpload: retryQueuedUpload,
    cancelAllUploads,
    resetUploads,
    markAlreadyUploaded,
    reconcile,
  } = useUploadQueue();

  const loadAttachments = useCallback(
    async (id = transactionId): Promise<Attachment[]> => {
      if (!id) {
        setUploadedAttachments([]);
        return [];
      }

      setIsLoading(true);
      try {
        const attachments = await reconcile(id);
        setUploadedAttachments(attachments);
        return attachments;
      } finally {
        setIsLoading(false);
      }
    },
    [reconcile, transactionId]
  );

  const reconcileUploadResult = useCallback(
    async (result: UploadBatchResult, id: string, previous: Attachment[]) => {
      try {
        const latest = await loadAttachments(id);
        const previousIds = new Set(previous.map((attachment) => attachment.id));
        const counts = new Map<string, number>();
        for (const attachment of latest) {
          if (previousIds.has(attachment.id)) continue;
          const key = fileKey(attachment.name, attachment.size);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }

        for (const file of result.succeededFiles) consumeMatch(counts, file);
        const candidates = [...result.failedFiles, ...result.cancelledFiles];
        const alreadyUploaded = candidates.filter((file) => consumeMatch(counts, file));
        markAlreadyUploaded(alreadyUploaded);
        const resolved = new Set(alreadyUploaded);

        return {
          ...result,
          succeededFiles: [...result.succeededFiles, ...alreadyUploaded],
          failedFiles: result.failedFiles.filter((file) => !resolved.has(file)),
          cancelledFiles: result.cancelledFiles.filter((file) => !resolved.has(file)),
          unresolvedUploads: result.unresolvedUploads.filter((item) => !resolved.has(item.file)),
        };
      } catch (error) {
        if (error instanceof UploadSessionEndedError) throw error;
        // Keep per-file upload results visible if reconciliation itself fails.
        return result;
      }
    },
    [loadAttachments, markAlreadyUploaded]
  );

  const uploadFiles = useCallback(
    async (files: File[], id = transactionId) => {
      if (!id) throw new Error('Transação não encontrada para envio do anexo');

      const previous = uploadedAttachments;
      const result = await startUploads(id, files);
      return reconcileUploadResult(result, id, previous);
    },
    [reconcileUploadResult, transactionId, startUploads, uploadedAttachments]
  );

  const retryUpload = useCallback(
    async (uploadId: string, id = transactionId) => {
      if (!id) throw new Error('Transação não encontrada para reenviar o anexo');

      const previous = uploadedAttachments;
      const result = await retryQueuedUpload(uploadId, id);
      return reconcileUploadResult(result, id, previous);
    },
    [reconcileUploadResult, transactionId, retryQueuedUpload, uploadedAttachments]
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

  const resetAttachments = useCallback(() => {
    resetUploads();
    setUploadedAttachments([]);
    setRemoving(null);
  }, [resetUploads]);

  return {
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
  };
}

function consumeMatch(counts: Map<string, number>, file: File): boolean {
  const key = fileKey(file.name, file.size);
  const remaining = counts.get(key) ?? 0;
  if (remaining === 0) return false;
  counts.set(key, remaining - 1);
  return true;
}

function fileKey(name: string, size: number): string {
  return `${name}\u0000${size}`;
}
