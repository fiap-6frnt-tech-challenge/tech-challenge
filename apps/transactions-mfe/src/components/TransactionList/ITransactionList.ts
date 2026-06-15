import { TooltipPosition } from '@bytebank/design-system';
import type { Transaction } from '@bytebank/shared';
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
