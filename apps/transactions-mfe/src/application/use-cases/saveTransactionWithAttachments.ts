import type { NewTransaction, Transaction } from '@bytebank/core';
import type { AttachmentGateway, TransactionGateway } from '@bytebank/core/application';

export interface SaveTransactionDeps {
  transactions: Pick<TransactionGateway, 'create'>;
  attachments: Pick<AttachmentGateway, 'upload'>;
}

export interface SaveTransactionResult {
  transaction: Transaction;
  failedFiles: File[];
}

export const saveTransactionWithAttachments =
  (deps: SaveTransactionDeps) =>
  async (input: NewTransaction, files: File[]): Promise<SaveTransactionResult> => {
    const transaction = await deps.transactions.create(input);
    const results = await Promise.allSettled(
      files.map((file) => deps.attachments.upload(transaction.id, file))
    );
    const failedFiles = files.filter((_, i) => results[i].status === 'rejected');
    return { transaction, failedFiles };
  };
