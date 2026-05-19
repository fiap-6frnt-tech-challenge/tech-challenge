import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatCurrency, formatDate } from '@/lib/format';
import { BADGE_LABEL_MAP, BADGE_VARIANT_MAP } from '@/shared/constants/transaction';
import type { TransactionInfoProps } from './ITransactionInfo';

export function TransactionInfo({ transaction }: TransactionInfoProps) {
  return (
    <div className="flex flex-col gap-sm rounded-default bg-background p-lg mb-xl">
      <div className="flex items-center justify-between gap-sm overflow-hidden">
        <Tooltip content={transaction.description}>
          <span className="body-default text-content-primary block truncate">
            {transaction.description}
          </span>
        </Tooltip>
        <Badge variant={BADGE_VARIANT_MAP[transaction.type]}>
          {BADGE_LABEL_MAP[transaction.type]}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="label-default text-content-secondary">{formatDate(transaction.date)}</span>
        <span className="body-semibold">{formatCurrency(transaction.amount)}</span>
      </div>
    </div>
  );
}
