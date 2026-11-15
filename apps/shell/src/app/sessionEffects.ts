import { afterMfaRecoveryDelivery } from './mfaRecoveryDelivery';
import type { Observable } from 'rxjs';
import type { DomainEvent } from '@bytebank/core';
import { domainEvents$, logout, type AppStore } from '@bytebank/stores';

export function registerSessionExpiry(
  store: AppStore,
  events$: Observable<DomainEvent> = domainEvents$
): () => void {
  const subscription = events$.subscribe((event) => {
    if (event.type === 'session.expired' && store.getState().auth.isAuthenticated) {
      afterMfaRecoveryDelivery(() => void store.dispatch(logout('expired')));
    }
  });
  return () => subscription.unsubscribe();
}
