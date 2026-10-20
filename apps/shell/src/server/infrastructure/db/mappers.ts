import 'server-only';
import type { Attachment, Transaction, TransactionType } from '@bytebank/core';
import {
  ATTACHMENT_ENCRYPTION,
  type AttachmentRecord,
  type Cipher,
  type LegacyAttachment,
} from '@bytebank/core/application';
import type { AttachmentRow, TransactionRow } from '@/db/schema';
import { attachmentDownloadUrl } from '@/server/attachmentDownloadUrl';

type AttachmentField = 'name' | 'ref';

export const attachmentFieldContext = (attachmentId: string, field: AttachmentField) =>
  `attachment:${attachmentId}:${field}`;

export function encryptAttachmentFields(
  cipher: Cipher,
  attachmentId: string,
  fields: Pick<LegacyAttachment, 'name' | 'ref'>
) {
  return {
    name: cipher.encryptText(fields.name, attachmentFieldContext(attachmentId, 'name')),
    ref: cipher.encryptText(fields.ref, attachmentFieldContext(attachmentId, 'ref')),
    encVersion: ATTACHMENT_ENCRYPTION.aesGcm,
  };
}

function readField(cipher: Cipher, row: AttachmentRow, field: AttachmentField): string {
  return row.encVersion === ATTACHMENT_ENCRYPTION.legacy
    ? row[field]
    : cipher.decryptText(row[field], attachmentFieldContext(row.id, field));
}

export function toAttachment(row: AttachmentRow, cipher: Cipher): Attachment {
  return {
    id: row.id,
    downloadUrl: attachmentDownloadUrl(row.transactionId, row.id),
    name: readField(cipher, row, 'name'),
    size: row.size,
    mimeType: row.mimeType,
  };
}

export function toAttachmentRecord(
  row: AttachmentRow,
  ownerId: string,
  cipher: Cipher
): AttachmentRecord {
  return {
    ...toAttachment(row, cipher),
    ref: readField(cipher, row, 'ref'),
    transactionId: row.transactionId,
    ownerId,
    encVersion: row.encVersion,
  };
}

export function toTransaction(
  row: TransactionRow & { attachments?: AttachmentRow[] },
  cipher: Cipher
): Transaction {
  return {
    id: row.id,
    userId: row.userId,
    category: row.category,
    type: row.type as TransactionType,
    amount: row.amount,
    date: row.date,
    description: row.description,
    attachments: row.attachments?.map((attachment) => toAttachment(attachment, cipher)) ?? [],
  };
}
