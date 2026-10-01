import { useEffect, useState } from 'react';
import { Subject } from 'rxjs';
import { registerSpikeConsumer, spikeEvents$, type SpikeEvent } from '@bytebank/core';

export default function SpikeReceiver() {
  const [events, setEvents] = useState<SpikeEvent[]>([]);

  useEffect(() => {
    registerSpikeConsumer('dashboard', Subject);
    const subscription = spikeEvents$.subscribe((event) => setEvents((prev) => [...prev, event]));
    return () => subscription.unsubscribe();
  }, []);

  const last = events.at(-1);

  return (
    <section aria-label="dashboard-mfe" className="flex flex-col gap-sm">
      <h2 className="body-semibold">dashboard-mfe (assinante)</h2>
      <p>
        Eventos recebidos: <span data-testid="receiver-count">{events.length}</span>
      </p>
      <p>
        Último: <span data-testid="receiver-last">{last ? `${last.source}#${last.seq}` : '—'}</span>
      </p>
    </section>
  );
}
