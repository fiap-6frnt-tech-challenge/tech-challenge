import { eq, desc } from 'drizzle-orm';
import type { Transaction, NewTransaction, TransactionType } from '@bytebank/shared';
import { db } from '@/db';
import { transactions, type TransactionRow } from '@/db/schema';

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type as TransactionType,
    amount: row.amount,
    date: row.date,
    description: row.description,
  };
}

export async function getAll(): Promise<Transaction[]> {
  const rows = await db.select().from(transactions).orderBy(desc(transactions.date));
  return rows.map(toTransaction);
}

export async function getById(id: string): Promise<Transaction | null> {
  const [row] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return row ? toTransaction(row) : null;
}

export async function create(data: NewTransaction): Promise<Transaction> {
  const [row] = await db
    .insert(transactions)
    .values({
      id: crypto.randomUUID(),
      type: data.type,
      amount: data.amount,
      date: data.date,
      description: data.description,
    })
    .returning();
  return toTransaction(row);
}

export async function update(
  id: string,
  data: Partial<NewTransaction>
): Promise<Transaction | null> {
  const patch: Partial<TransactionRow> = { updatedAt: new Date() };
  if (data.type !== undefined) patch.type = data.type;
  if (data.amount !== undefined) patch.amount = data.amount;
  if (data.date !== undefined) patch.date = data.date;
  if (data.description !== undefined) patch.description = data.description;

  const [row] = await db.update(transactions).set(patch).where(eq(transactions.id, id)).returning();
  return row ? toTransaction(row) : null;
}

export async function remove(id: string): Promise<boolean> {
  const rows = await db.delete(transactions).where(eq(transactions.id, id)).returning();
  return rows.length > 0;
}
