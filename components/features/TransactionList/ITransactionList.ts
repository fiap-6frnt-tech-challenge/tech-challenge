import { TooltipPosition } from '@/components/ui';
import type { Transaction } from '@/types';
import { ReactNode } from 'react';

export interface TransactionListProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  emptyState?: ReactNode;
  title?: string;
  className?: string;
  showActions?: boolean;
  tooltipPosition?: TooltipPosition;
}
