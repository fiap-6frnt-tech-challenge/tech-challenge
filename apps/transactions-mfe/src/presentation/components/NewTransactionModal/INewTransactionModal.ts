import type { TransactionType } from '@bytebank/shared';

export interface NewTransactionData {
  type: TransactionType;
  amount: number;
}

export interface NewTransactionModalProps {
  isOpen: boolean;
  onCancel: () => void;
}
