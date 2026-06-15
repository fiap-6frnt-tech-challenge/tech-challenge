import type { TransactionType } from '@bytebank/shared';

export interface TransactionFiltersValue {
  type: TransactionType | 'all';
  dateFrom: string;
  dateTo: string;
  sortBy: 'date' | 'amount';
  sortOrder: 'asc' | 'desc';
}

export interface TransactionFiltersProps {
  value: TransactionFiltersValue;
  onChange: (filters: TransactionFiltersValue) => void;
  onClear?: () => void;
}

export const DEFAULT_FILTERS: TransactionFiltersValue = {
  type: 'all',
  dateFrom: '',
  dateTo: '',
  sortBy: 'date',
  sortOrder: 'desc',
};
