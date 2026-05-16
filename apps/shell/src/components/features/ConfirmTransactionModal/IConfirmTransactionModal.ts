import type { TransactionFormValues } from '@/components/features/TransactionForm/ITransactionForm';

export interface ConfirmTransactionModalProps {
  isOpen: boolean;
  transaction: TransactionFormValues | null;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}
