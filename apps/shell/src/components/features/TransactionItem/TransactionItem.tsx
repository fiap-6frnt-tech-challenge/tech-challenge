'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/classes';
import { BADGE_LABEL_MAP, BADGE_VARIANT_MAP } from '@/shared/constants/transaction';
import { formatCurrency, formatDate } from '@/lib/format';
import type { TransactionItemProps } from './ITransactionItem';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { IconButton } from '@/components/ui/Button';

export function TransactionItem({
  transaction,
  onEdit,
  onDelete,
  className,
  showActions = true,
  tooltipPosition = 'top',
}: TransactionItemProps) {
  const { id, type, description, amount, date } = transaction;

  return (
    <li
      className={cn(
        'flex flex-col items-start justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md',
        '@md:grid @md:grid-cols-[7rem_1fr_auto_auto] @md:items-center @md:gap-x-4 @md:gap-y-0',
        showActions ? '' : 'gap-1',
        className
      )}
    >
      <div className="w-full justify-between items-center flex gap-3 min-w-0 flex-1 @md:contents">
        <Badge variant={BADGE_VARIANT_MAP[type]} size="md" className="@md:order-1">
          {BADGE_LABEL_MAP[type]}
        </Badge>

        {showActions && (
          <div className="flex lg:ml-2 w-1/3 justify-end @md:order-4 @md:mt-0 @md:w-auto @md:ml-0">
            <IconButton
              aria-label={`Edit transaction: ${description}`}
              onClick={() => onEdit(id)}
              icon={<Pencil size={18} />}
            />

            <IconButton
              aria-label={`Delete transaction: ${description}`}
              onClick={() => onDelete(id)}
              icon={<Trash2 size={18} />}
            />
          </div>
        )}
      </div>

      <div className="w-full flex justify-between items-end gap-2 shrink-0 @md:contents">
        <div className="flex flex-1 min-w-0 @md:order-2">
          <div className="min-w-0 w-full">
            <Tooltip content={description} position={tooltipPosition}>
              <p
                className="mb-1 @md:mb-0 truncate font-normal text-content-primary"
                title={description}
                aria-label={description}
              >
                {description}
              </p>
            </Tooltip>
            <p className="text-sm text-content-secondary">{formatDate(date)}</p>
          </div>
        </div>
        <span className={'font-bold @md:order-3'}>{formatCurrency(amount, true)}</span>
      </div>
    </li>
  );
}
