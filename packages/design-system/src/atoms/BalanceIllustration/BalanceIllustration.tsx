import { cn } from '@bytebank/shared';
import type { BalanceIllustrationProps } from './IBalanceIllustration';

export const BALANCE_ILLUSTRATION_SRC = '/piggy-bank.png';

export function BalanceIllustration({ className }: BalanceIllustrationProps) {
  return (
    <img
      src={BALANCE_ILLUSTRATION_SRC}
      aria-hidden="true"
      width={283}
      height={229}
      loading="eager"
      fetchPriority="high"
      className={cn('pointer-events-none select-none', className)}
      alt=""
    />
  );
}
