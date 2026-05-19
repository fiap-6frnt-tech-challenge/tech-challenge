import { cn } from '@/lib/classes';
import { CardProps } from './types';

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({
  padding = 'md',
  hoverable = false,
  as: Tag = 'div',
  className,
  children,
}: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-lg bg-surface border border-border shadow-card',
        paddingStyles[padding],
        hoverable && 'transition-shadow cursor-pointer hover:shadow-card-hover',
        className
      )}
    >
      {children}
    </Tag>
  );
}
