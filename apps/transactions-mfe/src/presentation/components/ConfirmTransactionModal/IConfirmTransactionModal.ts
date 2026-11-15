import type { TransactionFormValues } from '../TransactionForm/ITransactionForm';
import type { TransactionFlowMode } from '../TransactionFlowStatus';

export interface ConfirmTransactionModalProps {
  isOpen: boolean;
  transaction: TransactionFormValues | null;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  mode?: TransactionFlowMode;
  error?: string | null;
  onRetry?: () => void;
}
