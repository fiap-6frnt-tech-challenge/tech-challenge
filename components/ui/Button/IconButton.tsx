import { cn } from '@/lib/classes';
import type { IconButtonProps } from './types';

export function IconButton({ icon, className, disabled, ...props }: IconButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center p-2 rounded-md text-content-primary cursor-pointer',
        'min-h-[44px] min-w-[44px]',
        'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
        'hover:bg-surface-hover hover:rounded-full disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
