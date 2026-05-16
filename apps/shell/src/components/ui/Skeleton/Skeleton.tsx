import { cn } from '@/lib/classes';
import type { SkeletonProps, SkeletonListProps } from './ISkeleton';

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={cn('animate-pulse rounded-default bg-border', className)} />
  );
}

export function SkeletonList({ lines = 3, showActions = true }: SkeletonListProps) {
  return (
    <div className="flex flex-col gap-sm" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex flex-col gap-sm rounded-default border border-border bg-surface px-lg py-md shadow-card',
            '@md:grid @md:grid-cols-[7rem_1fr_auto_auto] @md:items-center @md:gap-x-lg @md:gap-y-0'
          )}
        >
          <div className="h-full w-full flex items-center justify-between gap-3 min-w-0 @md:contents">
            {/* Badge */}
            <Skeleton className="h-6 w-15 rounded-md @md:order-1 @md:w-full" />

            {/* Icons */}
            {showActions && (
              <div className="flex items-center justify-end @md:order-4 @md:w-auto">
                <Skeleton className="h-5 w-5 m-md rounded-default" />
                <Skeleton className="h-5 w-5 m-md rounded-default" />
              </div>
            )}
          </div>

          <div className="w-full flex justify-between items-end gap-2 @md:contents">
            <div className="flex flex-1 min-w-0 @md:order-2">
              <div className="min-w-0 w-full">
                {/* Description */}
                <Skeleton className="h-5 w-3/4 mb-sm" />

                {/* Date */}
                <Skeleton className="h-3.75 w-20" />
              </div>
            </div>

            {/* Amount */}
            <Skeleton className="h-5 w-16 @md:order-3" />
          </div>
        </div>
      ))}
    </div>
  );
}
