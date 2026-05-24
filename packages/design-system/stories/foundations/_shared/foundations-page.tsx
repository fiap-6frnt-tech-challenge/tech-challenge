import type { ReactNode } from 'react';

type FoundationsPageProps = {
  children: ReactNode;
};

export function FoundationsPage({ children }: FoundationsPageProps) {
  return <div className="flex flex-col gap-6 p-6">{children}</div>;
}
