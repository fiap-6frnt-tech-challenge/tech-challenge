import { TRANSACTION_TYPE } from '@/shared/constants/transaction';

export type TransactionType = (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // always positive; direction is determined by `type`
  date: string; // ISO 8601 format: "YYYY-MM-DD"
  description: string;
}

export interface Account {
  id: string;
  owner: string;
  balance: number;
  transactions: Transaction[];
}

// Utility types used by forms and CRUD operations
export type NewTransaction = Omit<Transaction, 'id'>;
export type UpdateTransaction = Partial<NewTransaction>;
