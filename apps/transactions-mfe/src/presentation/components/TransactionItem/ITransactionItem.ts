import { TooltipPosition } from '@bytebank/design-system';
import type { Transaction } from '@bytebank/shared';

export interface TransactionItemProps {
  transaction: Transaction;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
  showActions?: boolean;
  tooltipPosition?: TooltipPosition;
}
