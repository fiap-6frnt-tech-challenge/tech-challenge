import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn, formatCurrency } from '@bytebank/shared';
import { Card } from '../Card';
import { Skeleton } from '../Skeleton';
import { KpiCardProps } from './types';

export function KpiCard({
  label,
  value,
  delta,
  icon,
  loading = false,
  error = false,
  className,
}: KpiCardProps) {
  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;

  const deltaPercent =
    delta !== undefined ? `${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1)}%` : null;

  return (
    <Card className={cn('flex flex-col gap-3', className)} padding="md">
      {/* Linha superior: label + ícone opcional */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-content-secondary font-medium">{label}</span>
        {icon && (
          <span className="text-content-tertiary" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      {/* Valor principal */}
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : error ? (
        <span className="text-2xl font-bold text-content-tertiary" aria-label="Valor indisponível">
          --
        </span>
      ) : (
        <span className="text-2xl font-bold text-content-primary">{formatCurrency(value)}</span>
      )}

      {/* Delta (variação) */}
      {loading ? (
        <Skeleton className="h-4 w-16" />
      ) : delta !== undefined && !error ? (
        <div
          className={cn(
            'flex items-center gap-1 text-sm font-medium',
            isPositive && 'text-feedback-success',
            isNegative && 'text-feedback-danger',
            !isPositive && !isNegative && 'text-content-secondary'
          )}
          aria-label={
            isPositive
              ? `Aumento de ${deltaPercent} vs mês anterior`
              : isNegative
                ? `Queda de ${deltaPercent} vs mês anterior`
                : `Sem variação vs mês anterior`
          }
        >
          {isPositive && <TrendingUp size={14} aria-hidden="true" />}
          {isNegative && <TrendingDown size={14} aria-hidden="true" />}
          <span>{deltaPercent}</span>
        </div>
      ) : null}
    </Card>
  );
}
