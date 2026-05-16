import type { ReactNode } from 'react';

import { cn } from '@/lib/classes';

type TokenPreviewFrameProps = {
  children: ReactNode;
  className?: string;
};

export function TokenPreviewFrame({ children, className }: TokenPreviewFrameProps) {
  return <div className={cn('w-full rounded-default p-8', className)}>{children}</div>;
}
