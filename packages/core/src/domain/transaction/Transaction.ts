import type { TransactionType } from './TransactionType';

export interface Attachment {
  id: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  category: string;
  amount: number; // always positive; direction is determined by `type`
  date: string; // ISO 8601 format: "YYYY-MM-DD"
  description: string;
  attachments?: Attachment[];
}

export interface Account {
  id: string;
  owner: string;
  balance: number;
  transactions: Transaction[];
}

export type NewTransaction = Omit<Transaction, 'id' | 'userId' | 'attachments'>;
export type UpdateTransaction = Partial<NewTransaction>;

export type { TransactionType } from './TransactionType';

/** Combines validated input with identity assigned at the application boundary. */
export function createTransaction(input: NewTransaction, id: string, userId: string): Transaction {
  return { ...input, id, userId };
}
