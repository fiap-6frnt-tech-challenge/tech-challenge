import { Subject, filter, type Observable } from 'rxjs';
import type { DomainEvent } from '@bytebank/core';

const bus = new Subject<DomainEvent>();

export const domainEvents$: Observable<DomainEvent> = bus.asObservable();
export const publish = (event: DomainEvent): void => bus.next(event);
export const ofType = <T extends DomainEvent['type']>(type: T) =>
  filter((event: DomainEvent): event is Extract<DomainEvent, { type: T }> => event.type === type);
