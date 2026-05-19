'use client';

import dynamic from 'next/dynamic';
import { Component, type ReactNode } from 'react';

const HelloRemote = dynamic(
  async () => {
    const { loadHello } = await import('@/lib/federation');
    const Hello = await loadHello();
    return { default: Hello };
  },
  {
    ssr: false,
    loading: () => <div className="p-lg border border-border rounded-default">Carregando MFE…</div>,
  }
);

interface MFErrorBoundaryState {
  error: Error | null;
}

class MFErrorBoundary extends Component<{ children: ReactNode }, MFErrorBoundaryState> {
  state: MFErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): MFErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Log para observabilidade — em prod, plugar Sentry/Datadog aqui
    console.error('[RemoteHello] Failed to load MFE:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="p-lg border border-feedback-danger rounded-default bg-surface">
          <p className="body-semibold text-feedback-danger">MFE indisponível</p>
          <p className="body-default mt-sm">
            Não foi possível carregar o componente <code>hello/Hello</code> do remote em{' '}
            <code>:3001</code>. Confirme que o app <code>hello-mfe</code> está rodando (Track A do
            PoC).
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

export function RemoteHello() {
  return (
    <MFErrorBoundary>
      <HelloRemote />
    </MFErrorBoundary>
  );
}
