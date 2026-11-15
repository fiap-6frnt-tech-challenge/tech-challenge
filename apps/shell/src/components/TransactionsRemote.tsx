'use client';

import dynamic from 'next/dynamic';
import { PageHeading, Skeleton, SkeletonList } from '@bytebank/design-system';
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

export function TransactionsSkeleton() {
  return (
    <section
      className="flex flex-col gap-lg overflow-hidden h-full px-1"
      aria-busy="true"
      aria-label="Carregando transações"
    >
      <div className="flex flex-col">
        <PageHeading
          title="Transações"
          action={<Skeleton className="h-[44px] w-[44px] rounded-md" />}
        />
        <Skeleton className="h-12 w-full rounded-default" />
      </div>
      <div className="w-full overflow-y-auto flex-1 min-h-0 @container">
        <SkeletonList lines={5} />
      </div>
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
