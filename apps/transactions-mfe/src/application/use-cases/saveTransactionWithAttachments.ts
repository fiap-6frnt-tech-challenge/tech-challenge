import type { Attachment, NewTransaction, Transaction } from '@bytebank/core';
import type { TransactionGateway } from '@bytebank/core/application';
import { UploadSessionEndedError } from '../uploadSession';

export interface SaveTransactionDeps {
  transactions: Pick<TransactionGateway, 'create'>;
  attachments: {
    uploadFiles: (
      transactionId: string,
      files: File[],
      onProgress?: (done: number) => void
    ) => Promise<{
      succeededFiles: File[];
      failedFiles: File[];
      cancelledFiles: File[];
    }>;
    reconcile?: (transactionId: string) => Promise<Attachment[]>;
  };
}

export interface UploadAttachmentsResult {
  failedFiles: File[];
  cancelledFiles: File[];
}

export interface SaveTransactionResult extends UploadAttachmentsResult {
  transaction: Transaction;
}

export const uploadTransactionAttachments =
  (attachments: SaveTransactionDeps['attachments']) =>
  async (
    transactionId: string,
    files: File[],
    onProgress?: (done: number) => void
  ): Promise<UploadAttachmentsResult> => {
    if (files.length === 0) return { failedFiles: [], cancelledFiles: [] };

    const { succeededFiles, failedFiles, cancelledFiles } = await attachments.uploadFiles(
      transactionId,
      files,
      onProgress
    );
    let reconciled: Attachment[] | undefined;
    try {
      reconciled = await attachments.reconcile?.(transactionId);
    } catch (error) {
      if (error instanceof UploadSessionEndedError) throw error;
      // A failed reconciliation must not discard the original upload outcomes.
    }

    const remainingCounts = new Map<string, number>();
    for (const attachment of reconciled ?? []) {
      const key = fileKey(attachment.name, attachment.size);
      remainingCounts.set(key, (remainingCounts.get(key) ?? 0) + 1);
    }

    for (const file of succeededFiles) consumeMatch(remainingCounts, file);

    return {
      failedFiles: failedFiles.filter((file) => !consumeMatch(remainingCounts, file)),
      cancelledFiles: cancelledFiles.filter((file) => !consumeMatch(remainingCounts, file)),
    };
  };

export const saveTransactionWithAttachments = (deps: SaveTransactionDeps) => {
  const upload = uploadTransactionAttachments(deps.attachments);
  return async (input: NewTransaction, files: File[]): Promise<SaveTransactionResult> => {
    const transaction = await deps.transactions.create(input);
    return { transaction, ...(await upload(transaction.id, files)) };
  };
};

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
