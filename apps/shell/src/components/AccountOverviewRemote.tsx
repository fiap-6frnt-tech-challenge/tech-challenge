'use client';

import dynamic from 'next/dynamic';
import { Card, Skeleton, SkeletonList } from '@bytebank/design-system';
import { Component, type ReactNode } from 'react';

const AccountOverview = dynamic(
  async () => {
    const { loadAccountOverview } = await import('@/lib/federation');
    const AccountOverviewComponent = await loadAccountOverview();
    return { default: AccountOverviewComponent };
  },
  {
    ssr: false,
    loading: () => <AccountOverviewSkeleton />,
  }
);

function BalanceCardSkeleton() {
  return (
    <Card padding="lg" className="relative overflow-hidden mb-sm">
      <div className="relative flex gap-lg flex-1 max-md:grid max-md:grid-cols-1 max-md:justify-items-center">
        <div className="flex flex-col max-md:items-center">
          <Skeleton className="h-7 w-40 mb-sm" />
          <Skeleton className="h-5 w-32 mb-0 md:mb-lg" />
          <Skeleton className="h-[229px] w-[283px] rounded-default hidden md:block" />
        </div>

        <div className="flex flex-col items-start p-2xl mt-0 md:mt-sm gap-sm min-w-50 self-start mx-auto max-md:items-center max-md:pt-0">
          <div className="w-fit min-w-40">
            <Skeleton className="h-8 w-24" />
            <span className="block h-px w-full bg-border my-xs" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-7 w-32" />
        </div>

        <Skeleton className="h-[229px] w-[283px] rounded-default md:hidden" />
      </div>
    </Card>
  );
}

function AccountOverviewSkeleton() {
  return (
    <section className="flex flex-col gap-lg" aria-busy="true" aria-label="Carregando visão geral">
      <BalanceCardSkeleton />
      <div className="@container">
        <Skeleton className="h-7 w-48 mb-4" />
        <SkeletonList lines={5} showActions={false} />
      </div>
      <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
        <Skeleton className="h-12 w-full rounded-default sm:h-10 sm:w-48" />
        <Skeleton className="h-12 w-full rounded-default sm:h-10 sm:w-44" />
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
    console.error('[AccountOverviewRemote] Failed to load MFE:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="p-lg border border-feedback-danger rounded-default bg-surface">
          <p className="body-semibold text-feedback-danger">Visão geral indisponível</p>
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

export function AccountOverviewRemote() {
  return (
    <MFErrorBoundary>
      <AccountOverview />
    </MFErrorBoundary>
  );
}
