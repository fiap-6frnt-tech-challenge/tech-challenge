import { and, asc, desc, eq, gte, ilike, inArray, lte, sql } from 'drizzle-orm';
import type { Attachment, Transaction, NewTransaction, TransactionType } from '@bytebank/shared';
import { db } from '@/db';
import { attachments, transactions, type AttachmentRow, type TransactionRow } from '@/db/schema';

type TransactionWithAttachments = TransactionRow & {
  attachments?: AttachmentRow[];
};

function toAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    url: row.url,
    name: row.name,
    size: row.size,
    mimeType: row.mimeType,
  };
}

function toTransaction(
  row: TransactionWithAttachments,
  fallbackAttachments: Attachment[] = []
): Transaction {
  return {
    id: row.id,
    userId: row.userId,
    category: row.category,
    type: row.type as TransactionType,
    amount: row.amount,
    date: row.date,
    description: row.description,
    attachments: row.attachments?.map(toAttachment) ?? fallbackAttachments,
  };
}

export async function getAll(): Promise<Transaction[]> {
  const result = await db.query.transactions.findMany({
    orderBy: [desc(transactions.date)],
    with: {
      attachments: true,
    },
  });
  return result.map((row) => toTransaction(row));
}

export async function getAllByUser(
  userId: string,
  range: { from?: string; to?: string } = {}
): Promise<Transaction[]> {
  const conditions = [eq(transactions.userId, userId)];
  if (range.from) conditions.push(gte(transactions.date, range.from));
  if (range.to) conditions.push(lte(transactions.date, range.to));

  const result = await db.query.transactions.findMany({
    where: and(...conditions),
    orderBy: [desc(transactions.date)],
    with: { attachments: true },
  });
  return result.map((row) => toTransaction(row));
}

export type ListParams = {
  userId?: string;
  type?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  category?: string[];
  amount_gte?: number;
  amount_lte?: number;
  sortBy?: 'date' | 'amount';
  sortOrder?: 'asc' | 'desc';
  page: number;
  perPage: number;
};

export type PaginatedResult = {
  data: Transaction[];
  pages: number;
  items: number;
};

export async function listTransactions(params: ListParams): Promise<PaginatedResult> {
  const conditions = [];
  if (params.userId) conditions.push(eq(transactions.userId, params.userId));
  if (params.type) conditions.push(eq(transactions.type, params.type));
  if (params.dateFrom) conditions.push(gte(transactions.date, params.dateFrom));
  if (params.dateTo) conditions.push(lte(transactions.date, params.dateTo));
  if (params.q) conditions.push(ilike(transactions.description, `%${params.q}%`));
  if (params.category?.length) conditions.push(inArray(transactions.category, params.category));
  if (params.amount_gte !== undefined) conditions.push(gte(transactions.amount, params.amount_gte));
  if (params.amount_lte !== undefined) conditions.push(lte(transactions.amount, params.amount_lte));

  const where = conditions.length ? and(...conditions) : undefined;

  const sortCol = params.sortBy === 'amount' ? transactions.amount : transactions.date;
  const orderBy = params.sortOrder === 'asc' ? asc(sortCol) : desc(sortCol);

  const offset = (params.page - 1) * params.perPage;

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(where);

  const rows = await db.query.transactions.findMany({
    where,
    orderBy: [orderBy],
    limit: params.perPage,
    offset,
    with: { attachments: true },
  });

  const items = countRow?.count ?? 0;
  return {
    data: rows.map((row) => toTransaction(row)),
    pages: Math.max(1, Math.ceil(items / params.perPage)),
    items,
  };
}

export async function getById(id: string): Promise<Transaction | null> {
  const row = await db.query.transactions.findFirst({
    where: eq(transactions.id, id),
    with: {
      attachments: true,
    },
  });
  return row ? toTransaction(row) : null;
}

export async function create(data: NewTransaction): Promise<Transaction> {
  return db.transaction(async (tx) => {
    const id = crypto.randomUUID();
    const [row] = await tx
      .insert(transactions)
      .values({
        id,
        userId: data.userId,
        category: data.category,
        type: data.type,
        amount: data.amount,
        date: data.date,
        description: data.description,
      })
      .returning();

    if (data.attachments?.length) {
      await tx.insert(attachments).values(
        data.attachments.map((attachment) => ({
          ...attachment,
          id: attachment.id || crypto.randomUUID(),
          transactionId: id,
        }))
      );
    }

    return toTransaction(row, data.attachments ?? []);
  });
}

export async function update(
  id: string,
  data: Partial<NewTransaction>
): Promise<Transaction | null> {
  const patch: Partial<TransactionRow> = { updatedAt: new Date() };
  if (data.userId !== undefined) patch.userId = data.userId;
  if (data.category !== undefined) patch.category = data.category;
  if (data.type !== undefined) patch.type = data.type;
  if (data.amount !== undefined) patch.amount = data.amount;
  if (data.date !== undefined) patch.date = data.date;
  if (data.description !== undefined) patch.description = data.description;

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(transactions)
      .set(patch)
      .where(eq(transactions.id, id))
      .returning();
    if (!row) return null;

    if (data.attachments !== undefined) {
      await tx.delete(attachments).where(eq(attachments.transactionId, id));
      if (data.attachments.length) {
        await tx.insert(attachments).values(
          data.attachments.map((attachment) => ({
            ...attachment,
            id: attachment.id || crypto.randomUUID(),
            transactionId: id,
          }))
        );
      }
      return toTransaction(row, data.attachments);
    }

    const existingAttachments = await tx
      .select()
      .from(attachments)
      .where(eq(attachments.transactionId, id));

    return toTransaction({ ...row, attachments: existingAttachments });
  });
}

export async function remove(id: string): Promise<boolean> {
  const rows = await db.delete(transactions).where(eq(transactions.id, id)).returning();
  return rows.length > 0;
}
