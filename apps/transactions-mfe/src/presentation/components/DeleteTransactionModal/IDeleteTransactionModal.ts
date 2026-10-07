import type { Transaction } from '@bytebank/shared';

export interface DeleteTransactionModalProps {
  transaction: Transaction | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}
