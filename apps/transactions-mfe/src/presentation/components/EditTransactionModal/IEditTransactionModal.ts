import type { Transaction } from '@bytebank/shared';
import type { TransactionFormValues } from '../TransactionForm/ITransactionForm';

export interface EditTransactionModalProps {
  transaction: Transaction | null;
  onConfirm: (data: TransactionFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}
