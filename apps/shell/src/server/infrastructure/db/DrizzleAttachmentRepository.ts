import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { NotFoundError } from '@bytebank/core';
import type {
  AttachmentRecord,
  AttachmentRepository,
  NewAttachment,
} from '@bytebank/core/application';
import type { Database } from '@/db';
import { attachments, transactions } from '@/db/schema';
import { toAttachmentRecord } from './mappers';

function ownedAttachment(id: string, ownerId: string) {
  return and(eq(attachments.id, id), eq(transactions.userId, ownerId));
}

function ownedTransaction(transactionId: string, ownerId: string) {
  return and(eq(transactions.id, transactionId), eq(transactions.userId, ownerId));
}

export class DrizzleAttachmentRepository implements AttachmentRepository {
  constructor(private readonly db: Database) {}

  async list(transactionId: string, ownerId: string): Promise<AttachmentRecord[] | null> {
    const rows = await this.db
      .select({ attachment: attachments })
      .from(transactions)
      .leftJoin(attachments, eq(attachments.transactionId, transactions.id))
      .where(ownedTransaction(transactionId, ownerId))
      .orderBy(desc(attachments.createdAt));
    if (rows.length === 0) return null;
    return rows.flatMap(({ attachment }) =>
      attachment ? [toAttachmentRecord(attachment, ownerId)] : []
    );
  }

  async findById(id: string, ownerId: string): Promise<AttachmentRecord | null> {
    const [row] = await this.db
      .select({ attachment: attachments })
      .from(attachments)
      .innerJoin(transactions, eq(attachments.transactionId, transactions.id))
      .where(ownedAttachment(id, ownerId))
      .limit(1);
    return row ? toAttachmentRecord(row.attachment, ownerId) : null;
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
        id: randomUUID(),
        transactionId,
        url: data.ref,
        name: data.name,
        size: data.size,
        mimeType: data.mimeType,
      })
      .returning();
    return toAttachmentRecord(row, ownerId);
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
}
