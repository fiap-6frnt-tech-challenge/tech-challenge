'use client';

import dynamic from 'next/dynamic';
import { BalanceIllustration, Card, Skeleton, SkeletonList } from '@bytebank/design-system';
import { cn } from '@bytebank/shared';
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

function TextSkeleton({ className, bar }: { className: string; bar: string }) {
  return (
    <p className={className} aria-hidden="true">
      <span
        className={cn('inline-block h-[1em] animate-pulse rounded-default align-middle', bar)}
      />
    </p>
  );
}

function BalanceCardSkeleton() {
  return (
    <Card padding="lg" className="relative overflow-hidden mb-sm bg-brand-dark! text-text-on-bg">
      <div className="relative flex gap-lg flex-1 max-md:grid max-md:grid-cols-1 max-md:justify-items-center">
        <div className="flex flex-col max-md:items-center">
          <TextSkeleton className="text-xl font-semibold mb-sm" bar="w-40 bg-content-inverse/20" />
          <TextSkeleton className="text-sm mb-0 md:mb-lg" bar="w-32 bg-content-inverse/10" />
          <BalanceIllustration className="hidden md:block" />
        </div>

        <div className="flex flex-col items-start p-2xl mt-0 md:mt-sm gap-sm min-w-50 self-start mx-auto max-md:items-center max-md:pt-0">
          <div className="w-fit min-w-40">
            <Skeleton className="h-10 sm:h-8 w-24 bg-content-inverse/20" />
            <span className="block h-px w-full bg-icon-accent my-xs" />
            <Skeleton className="h-6 w-28 bg-content-inverse/10" />
          </div>
          <TextSkeleton className="text-xl font-bold" bar="w-32 bg-content-inverse/20" />
        </div>

        <BalanceIllustration className="md:hidden" />
      </div>
    </Card>
  );
}

export function AccountOverviewSkeleton() {
  return (
    <section className="flex flex-col gap-lg" aria-busy="true" aria-label="Carregando visão geral">
      <BalanceCardSkeleton />
      <div className="@container">
        <TextSkeleton
          className="heading text-content-primary sm:truncate sm:tracking-tight mb-4"
          bar="w-48 bg-border"
        />
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
