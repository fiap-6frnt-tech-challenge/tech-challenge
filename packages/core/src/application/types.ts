import type { Attachment, NewTransaction, Transaction } from '../domain';

export interface Page<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export type NewTransactionData = NewTransaction & { id: string };
export type TransactionPatch = Partial<NewTransactionData>;

export interface DateRange {
  from: string;
  to: string;
}

export interface AccountOverview {
  balance: number;
  recent: Transaction[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

export type NewUser = User;

export interface StoredFile {
  ref: string;
  name: string;
  size: number;
  contentType: string;
}

export interface NewAttachment {
  name: string;
  size: number;
  mimeType: string;
  ref: string;
}

export type AttachmentRecord = Attachment & { ref: string; transactionId: string; ownerId: string };
