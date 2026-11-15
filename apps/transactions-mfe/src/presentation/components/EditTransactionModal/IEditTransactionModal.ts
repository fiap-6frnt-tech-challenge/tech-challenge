import type { Transaction } from '@bytebank/shared';
import type { TransactionFormValues } from '../TransactionForm/ITransactionForm';

export interface EditTransactionModalProps {
  transaction: Transaction | null;
  onSave: (data: TransactionFormValues) => Promise<{ id: string }>;
  onClose: () => void;
}
