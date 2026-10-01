'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Subject } from 'rxjs';
import { registerSpikeConsumer, spikeEvents$, type SpikeEvent } from '@bytebank/core';

const SpikeEmitter = dynamic(
  async () => {
    const { loadSpikeEmitter } = await import('@/lib/federation');
    return { default: await loadSpikeEmitter() };
  },
  { ssr: false, loading: () => <p>Carregando transactions-mfe…</p> }
);

const SpikeReceiver = dynamic(
  async () => {
    const { loadSpikeReceiver } = await import('@/lib/federation');
    return { default: await loadSpikeReceiver() };
  },
  { ssr: false, loading: () => <p>Carregando dashboard-mfe…</p> }
);

export function SpikeA() {
  const [events, setEvents] = useState<SpikeEvent[]>([]);

  useEffect(() => {
    registerSpikeConsumer('shell', Subject);
    const subscription = spikeEvents$.subscribe((event) => setEvents((prev) => [...prev, event]));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <main className="flex flex-col gap-lg p-xl">
      <h1 className="heading">Spike A — barramento RxJS entre MFEs</h1>
      <section aria-label="shell" className="flex flex-col gap-sm">
        <h2 className="body-semibold">shell (assinante)</h2>
        <p>
          Eventos recebidos: <span data-testid="shell-count">{events.length}</span>
        </p>
      </section>
      <SpikeEmitter />
      <SpikeReceiver />
    </main>
  );
}
