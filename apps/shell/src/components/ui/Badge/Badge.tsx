import { cn } from '@/lib/classes';
import { BadgeProps } from './types';

const variantStyles = {
  income: 'bg-badge-deposit-bg   text-badge-deposit-text',
  expense: 'bg-badge-withdraw-bg  text-badge-withdraw-text',
  transfer: 'bg-badge-transfer-bg  text-badge-transfer-text',
};

export function Badge({ variant = 'income', size = 'md', children, className }: BadgeProps) {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
    xl: 'px-6 py-3 text-lg',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}
