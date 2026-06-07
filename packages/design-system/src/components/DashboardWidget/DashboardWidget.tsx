import { cn } from '@bytebank/shared';
import { Button, IconButton } from '../Button';
import { Card } from '../Card';
import { EmptyState } from '../EmptyState';
import { ErrorState } from '../ErrorState';
import { Skeleton } from '../Skeleton';
import { DashboardWidgetProps } from './types';
import { RotateCcw } from 'lucide-react';

export const DashboardWidget = ({
  title,
  loading = false,
  error = false,
  empty = false,
  emptyTitle = 'Sem dados',
  emptyDescription = 'Não há dados a serem exibidos para este período.',
  skeletonType = 'line',
  onRefresh,
  className,
  children,
}: DashboardWidgetProps) => {
  const renderContent = () => {
    if (loading) {
      switch (skeletonType) {
        case 'kpi':
          return (
            <div className="flex flex-col gap-sm py-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          );
        case 'bar':
          return (
            <div className="flex items-end justify-between gap-md h-40 px-lg pt-lg">
              <Skeleton className="h-24 w-8 flex-1" />
              <Skeleton className="h-36 w-8 flex-1" />
              <Skeleton className="h-16 w-8 flex-1" />
              <Skeleton className="h-28 w-8 flex-1" />
              <Skeleton className="h-20 w-8 flex-1" />
            </div>
          );
        case 'pie':
          return (
            <div className="flex items-center justify-center h-40">
              <Skeleton className="h-32 w-32 rounded-full" />
            </div>
          );
        case 'line':
        default:
          return (
            <div className="flex flex-col gap-md h-40 justify-between py-md relative">
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          );
      }
    }

    if (error) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <ErrorState
            action={
              onRefresh ? (
                <Button onClick={onRefresh} size="sm">
                  Tentar novamente
                </Button>
              ) : undefined
            }
          />
        </div>
      );
    }

    if (empty) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      );
    }

    return children;
  };

  return (
    <Card
      padding="lg"
      className={cn('flex flex-col h-full gap-md relative min-w-0 shadow-card', className)}
    >
      <div className="flex items-center justify-between">
        <h2 className="heading text-content-primary font-semibold">{title}</h2>
        {onRefresh && !loading && !error && (
          <IconButton icon={<RotateCcw size={18} />} onClick={onRefresh} aria-label={'Atualizar'} />
        )}
      </div>
      <div className="flex-1 min-w-0 min-h-0">{renderContent()}</div>
    </Card>
  );
};
