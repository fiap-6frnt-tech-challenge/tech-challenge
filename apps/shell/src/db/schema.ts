import { pgTable, text, doublePrecision, timestamp, integer } from 'drizzle-orm/pg-core';
import { TRANSACTION_TYPE } from '@bytebank/shared';
import { relations } from 'drizzle-orm/relations';

const transactionTypeValues = Object.values(TRANSACTION_TYPE) as [string, ...string[]];

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().default('joana'), // Default temporário
  category: text('category').notNull().default('default'),
  type: text('type', { enum: transactionTypeValues }).notNull(),
  amount: doublePrecision('amount').notNull(),
  date: text('date').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const attachments = pgTable('attachments', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id')
    .notNull()
    .references(() => transactions.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  name: text('name').notNull(),
  size: integer('size').notNull(),
  mimeType: text('mime_type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define relações no Drizzle para facilitar queries aninhadas
export const transactionsRelations = relations(transactions, ({ many }) => ({
  attachments: many(attachments),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  transaction: one(transactions, {
    fields: [attachments.transactionId],
    references: [transactions.id],
  }),
}));

export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
export type AttachmentRow = typeof attachments.$inferSelect;
export type NewAttachmentRow = typeof attachments.$inferInsert;
