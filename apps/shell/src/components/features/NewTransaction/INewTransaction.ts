import type { TransactionType } from '@bytebank/shared';

export interface NewTransactionData {
  type: TransactionType;
  amount: number;
}

export interface NewTransactionProps {
  onSubmit: (data: NewTransactionData) => void | Promise<void>;
  loading?: boolean;
}
