import { cn } from '@bytebank/shared';
import { Lock } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import { Skeleton } from '../Skeleton';
import type { AuthGuardProps } from './IAuthGuard';

function DefaultAuthSkeleton() {
  return (
    <div
      className="flex w-full min-w-80 max-w-full flex-col gap-md sm:max-w-120"
      role="status"
      aria-label="Carregando autenticação"
      aria-busy="true"
    >
      <Skeleton className="h-6 w-2/5" />
      <div className="flex flex-col gap-sm">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

export function AuthGuard({
  children,
  isLoading,
  isAuthenticated,
  fallbackSkeleton,
  unauthenticatedFallback,
  className,
}: AuthGuardProps) {
  if (isLoading) {
    return (
      <div className={cn('w-full', className)}>{fallbackSkeleton ?? <DefaultAuthSkeleton />}</div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={cn('w-full', className)}>
        {unauthenticatedFallback ?? (
          <EmptyState
            icon={<Lock aria-hidden="true" />}
            title="Acesso restrito"
            description="Entre na sua conta para continuar."
          />
        )}
      </div>
    );
  }

  return <>{children}</>;
}
