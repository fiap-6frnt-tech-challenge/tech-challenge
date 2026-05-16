import { TooltipPosition } from '@/components/ui';
import type { Transaction } from '@/types';

export interface TransactionItemProps {
  transaction: Transaction;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
  showActions?: boolean;
  tooltipPosition?: TooltipPosition;
}
