import 'server-only';
import type { Attachment, Transaction, TransactionType } from '@bytebank/core';
import type { AttachmentRecord } from '@bytebank/core/application';
import type { AttachmentRow, TransactionRow } from '@/db/schema';

export function toAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    url: row.url,
    name: row.name,
    size: row.size,
    mimeType: row.mimeType,
  };
}

export function toAttachmentRecord(row: AttachmentRow, ownerId: string): AttachmentRecord {
  return { ...toAttachment(row), ref: row.url, transactionId: row.transactionId, ownerId };
}

export function toTransaction(
  row: TransactionRow & { attachments?: AttachmentRow[] }
): Transaction {
  return {
    id: row.id,
    userId: row.userId,
    category: row.category,
    type: row.type as TransactionType,
    amount: row.amount,
    date: row.date,
    description: row.description,
    attachments: row.attachments?.map(toAttachment) ?? [],
  };
}
