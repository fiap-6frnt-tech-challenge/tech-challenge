import { Subject, type Observable } from 'rxjs';

export interface SpikeEvent {
  type: 'spike.ping';
  source: string;
  seq: number;
  sentAt: number;
}

export interface SpikeConsumer {
  coreInstanceId: string;
  publish: (event: SpikeEvent) => void;
  events$: Observable<SpikeEvent>;
  rxSubject: unknown;
  coreSubject: unknown;
}

export interface SpikeRegistry {
  coreEvaluations: string[];
  consumers: Record<string, SpikeConsumer>;
}

const globalScope = globalThis as { __bytebankSpikeA?: SpikeRegistry };
const registry = (globalScope.__bytebankSpikeA ??= { coreEvaluations: [], consumers: {} });

export const coreInstanceId = Math.random().toString(36).slice(2, 10);
registry.coreEvaluations.push(coreInstanceId);

const bus = new Subject<SpikeEvent>();

export const spikeEvents$: Observable<SpikeEvent> = bus.asObservable();

export function publishSpikeEvent(event: SpikeEvent): void {
  bus.next(event);
}

export function registerSpikeConsumer(name: string, rxSubject: unknown): void {
  registry.consumers[name] = {
    coreInstanceId,
    publish: publishSpikeEvent,
    events$: spikeEvents$,
    rxSubject,
    coreSubject: Subject,
  };
}
