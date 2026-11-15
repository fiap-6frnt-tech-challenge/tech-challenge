import { describe, expect, it } from 'vitest';
import { TestScheduler } from 'rxjs/testing';
import type { DomainEvent } from '@bytebank/core';
import { domainEvents$, ofType, publish } from './domainEvents';

const transaction = {
  id: 'tx-1',
  userId: 'user-1',
  type: 'withdrawal' as const,
  category: 'food',
  amount: 24,
  date: '2026-10-11',
  description: 'Almoço',
};
const created: DomainEvent = { type: 'transaction.created', version: 1, transaction };
const updated: DomainEvent = { type: 'transaction.updated', version: 1, transaction };
const deleted: DomainEvent = { type: 'transaction.deleted', version: 1, id: 'tx-1' };

describe('domain event bus', () => {
  it('filters event types without changing event order', () => {
    const scheduler = new TestScheduler((actual, expected) => expect(actual).toEqual(expected));
    scheduler.run(({ cold, expectObservable }) => {
      const source = cold<DomainEvent>('-a-b-c-|', { a: created, b: updated, c: deleted });
      expectObservable(source.pipe(ofType('transaction.created'))).toBe('-a-----|', {
        a: created,
      });
    });
  });

  it('publishes synchronously to active subscribers and stops after unsubscribe', () => {
    const received: DomainEvent[] = [];
    const subscription = domainEvents$.subscribe((event) => received.push(event));
    publish(created);
    expect(received).toEqual([created]);
    subscription.unsubscribe();
    publish(updated);
    expect(received).toEqual([created]);
  });

  it('does not replay events published before subscription', () => {
    publish(created);
    const received: DomainEvent[] = [];
    const subscription = domainEvents$.subscribe((event) => received.push(event));
    expect(received).toEqual([]);
    publish(deleted);
    expect(received).toEqual([deleted]);
    subscription.unsubscribe();
  });
});
