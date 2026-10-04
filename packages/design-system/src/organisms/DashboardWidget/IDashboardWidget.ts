import { ReactNode } from 'react';

export interface DashboardWidgetProps {
  title: string;
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  skeletonType?: 'bar' | 'line' | 'pie' | 'kpi';
  onRefresh?: () => void;
  className?: string;
  children: ReactNode;
}
