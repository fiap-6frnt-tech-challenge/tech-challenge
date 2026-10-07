import type { TransactionType } from '@bytebank/shared';

export interface TransactionFiltersValue {
  type: TransactionType | 'all';
  dateFrom: string;
  dateTo: string;
  sortBy: 'date' | 'amount';
  sortOrder: 'asc' | 'desc';
  q: string;
  amount_gte: number | undefined;
  amount_lte: number | undefined;
  category: string[];
}

export interface TransactionFiltersProps {
  value: TransactionFiltersValue;
  isFilterVisible: boolean;
  onChange: (filters: TransactionFiltersValue) => void;
  onClear?: () => void;
}

export const DEFAULT_FILTERS: TransactionFiltersValue = {
  type: 'all',
  dateFrom: '',
  dateTo: '',
  sortBy: 'date',
  sortOrder: 'desc',
  q: '',
  amount_gte: undefined,
  amount_lte: undefined,
  category: [],
};
