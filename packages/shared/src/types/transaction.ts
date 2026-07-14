import { TRANSACTION_TYPE } from '../constants/transaction';

export type TransactionType = (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

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

export type NewTransaction = Omit<Transaction, 'id'>;
export type UpdateTransaction = Partial<NewTransaction>;
