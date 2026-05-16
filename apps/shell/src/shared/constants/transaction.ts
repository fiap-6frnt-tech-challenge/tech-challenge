import { SelectOption } from '@/components/ui/Select';
import { TransactionType } from '@/types';

export const TRANSACTION_TYPE = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  TRANSFER: 'transfer',
} as const;

export const TRANSACTION_TYPE_OPTIONS = [
  { label: 'Depósito', value: TRANSACTION_TYPE.DEPOSIT },
  { label: 'Saque', value: TRANSACTION_TYPE.WITHDRAWAL },
  { label: 'Transferência', value: TRANSACTION_TYPE.TRANSFER },
] as SelectOption[];

export const BADGE_LABEL_MAP: Record<TransactionType, string> = {
  [TRANSACTION_TYPE.DEPOSIT]: 'Depósito',
  [TRANSACTION_TYPE.WITHDRAWAL]: 'Saque',
  [TRANSACTION_TYPE.TRANSFER]: 'Transferência',
};

export const BADGE_VARIANT_MAP: Record<TransactionType, 'income' | 'expense' | 'transfer'> = {
  [TRANSACTION_TYPE.DEPOSIT]: 'income',
  [TRANSACTION_TYPE.WITHDRAWAL]: 'expense',
  [TRANSACTION_TYPE.TRANSFER]: 'transfer',
};
