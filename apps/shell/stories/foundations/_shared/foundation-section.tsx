import type { ReactNode } from 'react';

import { cn } from '@/lib/classes';

type FoundationSectionProps = {
  title: string;
  description?: string;
  columnsClassName?: string;
  children: ReactNode;
};

export function FoundationSection({
  title,
  description,
  columnsClassName,
  children,
}: FoundationSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-content-primary">{title}</h3>
        {description ? <p className="text-sm text-content-secondary">{description}</p> : null}
      </div>

      <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2', columnsClassName)}>
        {children}
      </div>
    </section>
  );
}
