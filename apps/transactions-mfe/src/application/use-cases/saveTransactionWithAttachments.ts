import type { Attachment, NewTransaction, Transaction } from '@bytebank/core';
import type { TransactionGateway } from '@bytebank/core/application';
import { UploadSessionEndedError } from '../uploadSession';

export interface SaveTransactionDeps {
  transactions: Pick<TransactionGateway, 'create'>;
  attachments: {
    uploadFiles: (
      transactionId: string,
      files: File[]
    ) => Promise<{
      succeededFiles: File[];
      failedFiles: File[];
      cancelledFiles: File[];
    }>;
    reconcile?: (transactionId: string) => Promise<Attachment[]>;
  };
}

export interface SaveTransactionResult {
  transaction: Transaction;
  failedFiles: File[];
  cancelledFiles: File[];
}

export const saveTransactionWithAttachments =
  (deps: SaveTransactionDeps) =>
  async (input: NewTransaction, files: File[]): Promise<SaveTransactionResult> => {
    const transaction = await deps.transactions.create(input);
    if (files.length === 0) return { transaction, failedFiles: [], cancelledFiles: [] };

    const { succeededFiles, failedFiles, cancelledFiles } = await deps.attachments.uploadFiles(
      transaction.id,
      files
    );
    let reconciled: Attachment[] | undefined;
    try {
      reconciled = await deps.attachments.reconcile?.(transaction.id);
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
      transaction,
      failedFiles: failedFiles.filter((file) => !consumeMatch(remainingCounts, file)),
      cancelledFiles: cancelledFiles.filter((file) => !consumeMatch(remainingCounts, file)),
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
