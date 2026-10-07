import { cn } from '@bytebank/shared';
import { TransactionItem } from '../TransactionItem';
import { SkeletonList } from '@bytebank/design-system';
import type { TransactionListProps } from './ITransactionList';

export function TransactionList({
  transactions,
  isLoading = false,
  isPlaceholderData = false,
  onEdit,
  onDelete,
  emptyState,
  title,
  className,
  showActions = true,
  tooltipPosition,
  containerRef,
}: TransactionListProps) {
  const renderListContent = () => {
    if (isLoading) {
      return (
        <li className="list-none">
          <SkeletonList lines={5} showActions={showActions} />
        </li>
      );
    }

    if (!transactions.length) {
      if (!emptyState) {
        return null;
      }

      return <li className="list-none">{emptyState}</li>;
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
    <div ref={containerRef} className={cn('@container', className)} aria-busy={isPlaceholderData}>
      {title && (
        <h2 className="heading text-content-primary sm:truncate sm:tracking-tight mb-4">{title}</h2>
      )}

      <ul
        className={cn('flex flex-col gap-2 transition-opacity', isPlaceholderData && 'opacity-60')}
      >
        {renderListContent()}
      </ul>
    </div>
  );
}
