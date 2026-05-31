import { pgTable, text, doublePrecision, timestamp } from 'drizzle-orm/pg-core';
import { TRANSACTION_TYPE } from '@bytebank/shared';

// Valores do enum de tipo batem com `TransactionType` do @bytebank/shared:
// 'deposit' | 'withdrawal' | 'transfer'.
const transactionTypeValues = Object.values(TRANSACTION_TYPE) as [string, ...string[]];

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  type: text('type', { enum: transactionTypeValues }).notNull(),
  amount: doublePrecision('amount').notNull(), // sempre positivo; direção vem de `type`
  date: text('date').notNull(), // ISO 8601 "YYYY-MM-DD" — string para bater com o tipo atual
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
