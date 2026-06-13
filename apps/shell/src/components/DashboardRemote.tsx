'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@bytebank/design-system';
import { Component, type ReactNode } from 'react';

const Dashboard = dynamic(
  async () => {
    const { loadDashboard } = await import('@/lib/federation');
    const DashboardComponent = await loadDashboard();
    return { default: DashboardComponent };
  },
  {
    ssr: false,
    loading: () => <DashboardSkeleton />,
  }
);

function DashboardSkeleton() {
  return (
    <div className="grid gap-lg p-lg" aria-busy="true" aria-label="Carregando dashboard">
      <Skeleton className="h-24" />
      <Skeleton className="h-64" />
    </div>
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
    console.error('[DashboardRemote] Failed to load MFE:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="p-lg border border-feedback-danger rounded-default bg-surface">
          <p className="body-semibold text-feedback-danger">Dashboard indisponível</p>
          <p className="body-default mt-sm">
            Não foi possível carregar o <code>dashboard-mfe</code> do remote em <code>:3002</code>.
            Confirme que o app está rodando (<code>npm run dev -w @bytebank/dashboard-mfe</code>).
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

export function DashboardRemote() {
  return (
    <MFErrorBoundary>
      <Dashboard />
    </MFErrorBoundary>
  );
}
