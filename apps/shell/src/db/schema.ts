import { pgTable, text, doublePrecision, timestamp } from 'drizzle-orm/pg-core';
import { TRANSACTION_TYPE } from '@bytebank/shared';

const transactionTypeValues = Object.values(TRANSACTION_TYPE) as [string, ...string[]];

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  type: text('type', { enum: transactionTypeValues }).notNull(),
  amount: doublePrecision('amount').notNull(),
  date: text('date').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
