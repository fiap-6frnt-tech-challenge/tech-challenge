import type { Transaction } from './transaction/Transaction';

export type DomainEvent =
  | { type: 'session.expired'; version: 1 }
  | { type: 'transaction.created'; version: 1; transaction: Transaction }
  | { type: 'transaction.updated'; version: 1; transaction: Transaction }
  | { type: 'transaction.deleted'; version: 1; id: string }
  | { type: 'attachment.added'; version: 1; transactionId: string; attachmentId: string }
  | { type: 'attachment.removed'; version: 1; transactionId: string; attachmentId: string };
