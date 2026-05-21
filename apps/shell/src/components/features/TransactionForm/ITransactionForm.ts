import type { NewTransaction } from '@bytebank/shared';

export type TransactionFormValues = Omit<NewTransaction, 'id'>;
export interface TransactionFormProps {
  onSubmit: (data: TransactionFormValues) => void;
  onCancel?: () => void;
  initialValues?: Partial<NewTransaction>;
  isSubmitting?: boolean;
}
export interface TransactionFormRef {
  reset: () => void;
}
