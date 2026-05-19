import type { Transaction } from '@/types';

export interface DeleteTransactionModalProps {
  transaction: Transaction | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}
