import { pgTable, text, doublePrecision, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { TRANSACTION_TYPE } from '@bytebank/shared';
import { relations } from 'drizzle-orm/relations';

const transactionTypeValues = Object.values(TRANSACTION_TYPE) as [string, ...string[]];

export const transactions = pgTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    category: text('category').notNull().default('default'),
    type: text('type', { enum: transactionTypeValues }).notNull(),
    amount: doublePrecision('amount').notNull(),
    date: text('date').notNull(),
    description: text('description').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('transactions_user_date_idx').on(t.userId, t.date),
    index('transactions_user_category_idx').on(t.userId, t.category),
    index('transactions_description_trgm_idx').using('gin', t.description.op('gin_trgm_ops')),
  ]
);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const attachments = pgTable(
  'attachments',
  {
    id: text('id').primaryKey(),
    transactionId: text('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    name: text('name').notNull(),
    size: integer('size').notNull(),
    mimeType: text('mime_type').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('attachments_transaction_idx').on(t.transactionId)]
);

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
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
