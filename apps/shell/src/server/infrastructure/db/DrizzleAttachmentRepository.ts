import 'server-only';
import { and, asc, desc, eq, gt, inArray } from 'drizzle-orm';
import { NotFoundError } from '@bytebank/core';
import {
  ATTACHMENT_ENCRYPTION,
  type AttachmentRecord,
  type AttachmentRepository,
  type Cipher,
  type LegacyAttachment,
  type LegacyAttachmentRepository,
  type NewAttachment,
} from '@bytebank/core/application';
import type { Database } from '@/db';
import { attachments, transactions } from '@/db/schema';
import { encryptAttachmentFields, toAttachmentRecord } from './mappers';

function ownedAttachment(id: string, ownerId: string) {
  return and(eq(attachments.id, id), eq(transactions.userId, ownerId));
}

function ownedTransaction(transactionId: string, ownerId: string) {
  return and(eq(transactions.id, transactionId), eq(transactions.userId, ownerId));
}

const isLegacy = eq(attachments.encVersion, ATTACHMENT_ENCRYPTION.legacy);

export class DrizzleAttachmentRepository
  implements AttachmentRepository, LegacyAttachmentRepository
{
  constructor(
    private readonly db: Database,
    private readonly cipher: Cipher
  ) {}

  async list(transactionId: string, ownerId: string): Promise<AttachmentRecord[] | null> {
    const rows = await this.db
      .select({ attachment: attachments })
      .from(transactions)
      .leftJoin(attachments, eq(attachments.transactionId, transactions.id))
      .where(ownedTransaction(transactionId, ownerId))
      .orderBy(desc(attachments.createdAt));
    if (rows.length === 0) return null;
    return rows.flatMap(({ attachment }) =>
      attachment ? [toAttachmentRecord(attachment, ownerId, this.cipher)] : []
    );
  }

  async findById(id: string, ownerId: string): Promise<AttachmentRecord | null> {
    const [row] = await this.db
      .select({ attachment: attachments })
      .from(attachments)
      .innerJoin(transactions, eq(attachments.transactionId, transactions.id))
      .where(ownedAttachment(id, ownerId))
      .limit(1);
    return row ? toAttachmentRecord(row.attachment, ownerId, this.cipher) : null;
  }

  async create(
    transactionId: string,
    ownerId: string,
    data: NewAttachment
  ): Promise<AttachmentRecord> {
    const [transaction] = await this.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(ownedTransaction(transactionId, ownerId))
      .limit(1);
    if (!transaction) throw new NotFoundError('Transação');

    const [row] = await this.db
      .insert(attachments)
      .values({
        id: data.id,
        transactionId,
        size: data.size,
        mimeType: data.mimeType,
        ...encryptAttachmentFields(this.cipher, data.id, data),
      })
      .returning();
    return toAttachmentRecord(row, ownerId, this.cipher);
  }

  async delete(id: string, ownerId: string): Promise<boolean> {
    const owned = this.db
      .select({ id: attachments.id })
      .from(attachments)
      .innerJoin(transactions, eq(attachments.transactionId, transactions.id))
      .where(ownedAttachment(id, ownerId));
    const rows = await this.db
      .delete(attachments)
      .where(inArray(attachments.id, owned))
      .returning({ id: attachments.id });
    return rows.length > 0;
  }

  async listLegacy(limit: number, afterId?: string): Promise<LegacyAttachment[]> {
    return this.db
      .select({
        id: attachments.id,
        name: attachments.name,
        mimeType: attachments.mimeType,
        ref: attachments.ref,
      })
      .from(attachments)
      .where(afterId ? and(isLegacy, gt(attachments.id, afterId)) : isLegacy)
      .orderBy(asc(attachments.id))
      .limit(limit);
  }

  async markEncrypted(id: string, data: Omit<LegacyAttachment, 'id'>): Promise<boolean> {
    const rows = await this.db
      .update(attachments)
      .set({ mimeType: data.mimeType, ...encryptAttachmentFields(this.cipher, id, data) })
      .where(and(eq(attachments.id, id), isLegacy))
      .returning({ id: attachments.id });
    return rows.length > 0;
  }
}
