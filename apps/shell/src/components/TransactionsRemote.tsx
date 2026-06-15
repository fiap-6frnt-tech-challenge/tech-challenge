'use client';

import dynamic from 'next/dynamic';
import { Skeleton, SkeletonList } from '@bytebank/design-system';
import { Component, type ReactNode } from 'react';

const TransactionsPage = dynamic(
  async () => {
    const { loadTransactionsPage } = await import('@/lib/federation');
    const TransactionsComponent = await loadTransactionsPage();
    return { default: TransactionsComponent };
  },
  {
    ssr: false,
    loading: () => <TransactionsSkeleton />,
  }
);

function FiltersSkeleton() {
  return (
    <div className="flex flex-wrap items-end gap-md">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="min-w-40 flex-1 flex flex-col gap-1.5">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-12 w-full rounded-default" />
        </div>
      ))}
      <Skeleton className="h-10 w-full rounded-default sm:h-8 sm:w-32" />
    </div>
  );
}

function TransactionsSkeleton() {
  return (
    <section
      className="flex flex-col gap-lg h-full px-1"
      aria-busy="true"
      aria-label="Carregando transações"
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between py-lg">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-11 w-11 rounded-md sm:hidden" />
        </div>
        <div className="pb-lg">
          <FiltersSkeleton />
        </div>
      </div>
      <SkeletonList lines={5} />
      <nav className="flex items-center justify-center gap-1 py-md">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-9 rounded-default" />
        ))}
      </nav>
    </section>
  );
}

interface MFErrorBoundaryState {
  error: Error | null;
}

class MFErrorBoundary extends Component<{ children: ReactNode }, MFErrorBoundaryState> {
  state: MFErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): MFErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[TransactionsRemote] Failed to load MFE:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="p-lg border border-feedback-danger rounded-default bg-surface">
          <p className="body-semibold text-feedback-danger">Transações indisponíveis</p>
          <p className="body-default mt-sm">
            Não foi possível carregar o <code>transactions-mfe</code> do remote em{' '}
            <code>:3003</code>. Confirme que o app está rodando (
            <code>npm run dev -w @bytebank/transactions-mfe</code>).
          </p>
          <details className="mt-sm label-default text-content-secondary">
            <summary>Detalhes técnicos</summary>
            <pre className="mt-xs overflow-x-auto">{this.state.error.message}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

export function TransactionsRemote() {
  return (
    <MFErrorBoundary>
      <TransactionsPage />
    </MFErrorBoundary>
  );
}
