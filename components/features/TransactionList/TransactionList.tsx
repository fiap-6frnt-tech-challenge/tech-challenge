import { cn } from '@/lib/classes';
import { TransactionItem } from '@/components/features/TransactionItem';
import { SkeletonList } from '@/components/ui/Skeleton';
import type { TransactionListProps } from './ITransactionList';

export function TransactionList({
  transactions,
  isLoading = false,
  onEdit,
  onDelete,
  emptyState,
  title,
  className,
  showActions = true,
  tooltipPosition,
}: TransactionListProps) {
  const renderListContent = () => {
    if (isLoading) {
      return <SkeletonList lines={5} showActions={showActions} />;
    }

    if (!transactions.length) {
      return emptyState;
    }

    return transactions.map((transaction) => (
      <TransactionItem
        key={transaction.id}
        transaction={transaction}
        onEdit={onEdit}
        onDelete={onDelete}
        showActions={showActions}
        tooltipPosition={tooltipPosition}
      />
    ));
  };

  return (
    <div className={cn('@container', className)}>
      {title && (
        <h2 className="heading text-content-primary sm:truncate sm:tracking-tight mb-4">{title}</h2>
      )}

      <ul className="flex flex-col gap-2">{renderListContent()}</ul>
    </div>
  );
}
