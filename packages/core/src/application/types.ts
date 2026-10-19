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
  image?: string;
}

export type NewUser = User;

export interface StoredFile {
  ref: string;
  name: string;
  size: number;
  contentType: string;
}

export const ATTACHMENT_ENCRYPTION = { legacy: 0, aesGcm: 1 } as const;

export interface NewAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  ref: string;
}

export type AttachmentRecord = Attachment & {
  ref: string;
  transactionId: string;
  ownerId: string;
  encVersion: number;
};

export interface LegacyAttachment {
  id: string;
  name: string;
  mimeType: string;
  ref: string;
}

export interface AttachmentUpload {
  name: string;
  bytes: Uint8Array;
}

export interface AttachmentFile {
  name: string;
  mimeType: string;
  bytes: Uint8Array;
}
