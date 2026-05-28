import { cn } from '@bytebank/shared';
import { Lock } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import { Skeleton } from '../Skeleton';
import type { AuthGuardProps } from './IAuthGuard';

function DefaultAuthSkeleton() {
  return (
    <div
      className="flex w-full max-w-120 flex-col gap-md"
      role="status"
      aria-label="Carregando autenticação"
    >
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-24 w-full" />
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
