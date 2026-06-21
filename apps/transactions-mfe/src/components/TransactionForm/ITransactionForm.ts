import type { ReactNode } from 'react';
import type { NewTransaction } from '@bytebank/shared';
import type { TransactionFormValues } from './schema';

export type { TransactionFormValues };
export interface TransactionFormProps {
  onSubmit: (data: TransactionFormValues) => void;
  onCancel?: () => void;
  initialValues?: Partial<NewTransaction>;
  isSubmitting?: boolean;
  attachmentSlot?: ReactNode;
}
export interface TransactionFormRef {
  reset: () => void;
}
