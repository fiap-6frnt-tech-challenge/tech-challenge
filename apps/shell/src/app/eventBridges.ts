import type { Observable } from 'rxjs';
import type { DomainEvent } from '@bytebank/core';
import {
  domainEvents$,
  notificationAdded,
  selectIsAuthenticated,
  type RootState,
  type AppDispatch,
  type FeedbackMessage,
} from '@bytebank/stores';

const feedback: Partial<Record<DomainEvent['type'], FeedbackMessage>> = {
  'transaction.created': {
    type: 'success',
    title: 'Transação adicionada!',
    message: 'Seu extrato foi atualizado.',
  },
  'transaction.updated': {
    type: 'success',
    title: 'Transação atualizada',
    message: 'A transação foi atualizada com sucesso.',
  },
  'transaction.deleted': {
    type: 'success',
    title: 'Transação excluída',
    message: 'A transação foi removida com sucesso.',
  },
  'attachment.added': {
    type: 'success',
    title: 'Anexo enviado',
    message: 'A lista de anexos foi atualizada.',
  },
  'attachment.removed': {
    type: 'success',
    title: 'Anexo removido',
    message: 'A lista de anexos foi atualizada.',
  },
};

export function registerEventBridges(
  store: { dispatch: AppDispatch; getState: () => RootState },
  events$: Observable<DomainEvent> = domainEvents$
): () => void {
  const subscription = events$.subscribe((event) => {
    const message = feedback[event.type];
    if (message && selectIsAuthenticated(store.getState()))
      store.dispatch(notificationAdded(message));
  });
  return () => subscription.unsubscribe();
}
