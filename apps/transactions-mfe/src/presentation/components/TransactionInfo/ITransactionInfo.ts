import type { Transaction } from '@bytebank/shared';

export type TransactionInfoValue = Pick<Transaction, 'type' | 'amount' | 'date' | 'description'>;

export interface TransactionInfoProps {
  transaction: TransactionInfoValue;
}
