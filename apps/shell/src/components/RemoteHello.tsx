'use client';

import dynamic from 'next/dynamic';

const RemoteHello = dynamic(
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

export { RemoteHello };
