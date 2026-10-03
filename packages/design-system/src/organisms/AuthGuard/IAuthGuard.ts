import type { ReactNode } from 'react';

export interface AuthGuardProps {
  children: ReactNode;
  isLoading: boolean;
  isAuthenticated: boolean;
  fallbackSkeleton?: ReactNode;
  unauthenticatedFallback?: ReactNode;
  className?: string;
}
