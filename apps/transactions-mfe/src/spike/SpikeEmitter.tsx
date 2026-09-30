import { useEffect, useRef, useState } from 'react';
import { Subject } from 'rxjs';
import { publishSpikeEvent, registerSpikeConsumer } from '@bytebank/core';

export default function SpikeEmitter() {
  const seq = useRef(0);
  const [sent, setSent] = useState(0);

  useEffect(() => {
    registerSpikeConsumer('transactions', Subject);
  }, []);

  const emit = () => {
    seq.current += 1;
    publishSpikeEvent({
      type: 'spike.ping',
      source: 'transactions-mfe',
      seq: seq.current,
      sentAt: performance.now(),
    });
    setSent(seq.current);
  };

  return (
    <section aria-label="transactions-mfe" className="flex flex-col gap-sm">
      <h2 className="body-semibold">transactions-mfe (emissor)</h2>
      <button type="button" onClick={emit} className="w-fit rounded-default border px-md py-sm">
        Emitir evento
      </button>
      <p>
        Eventos emitidos: <span data-testid="emitter-sent">{sent}</span>
      </p>
    </section>
  );
}
