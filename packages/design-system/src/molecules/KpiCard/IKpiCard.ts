import { ReactNode } from 'react';

export interface KpiCardProps {
  label: string;
  value: number;
  delta?: number; // Variação percentual (ex: 0.12 = +12%, -0.05 = -5%)
  icon?: ReactNode;
  loading?: boolean;
  error?: boolean;
  className?: string;
}
