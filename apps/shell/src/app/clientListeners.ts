import { isAnyOf } from '@reduxjs/toolkit';
import type { QueryClient } from '@tanstack/react-query';
import {
  clearSession,
  logout,
  notificationAdded,
  resetClientState,
  uploadFailed,
  type AppStartListening,
  type AppStore,
  selectHasPendingUploads,
  invalidateClientSession,
} from '@bytebank/stores';

export function registerPendingUploadWarning(
  store: Pick<AppStore, 'getState'>,
  target: EventTarget
): () => void {
  const beforeUnload = (event: Event) => {
    if (!selectHasPendingUploads(store.getState())) return;
    event.preventDefault();
    (event as BeforeUnloadEvent).returnValue = '';
  };
  target.addEventListener('beforeunload', beforeUnload);
  return () => target.removeEventListener('beforeunload', beforeUnload);
}

export function registerClientListeners({
  startListening,
  queryClient,
  cancelUploads,
}: {
  startListening: AppStartListening;
  queryClient: Pick<QueryClient, 'clear'>;
  cancelUploads: () => void;
}): () => void {
  const stopLogout = startListening({
    matcher: isAnyOf(logout.pending, clearSession),
    effect: (_action, api) => {
      invalidateClientSession();
      try {
        cancelUploads();
      } finally {
        queryClient.clear();
        api.dispatch(resetClientState());
      }
    },
  });
  const stopUploadFailure = startListening({
    actionCreator: uploadFailed,
    effect: ({ payload }, api) => {
      const previous = api.getOriginalState().uploads.entities[payload.id];
      if (!previous || !['queued', 'uploading'].includes(previous.status)) return;
      api.dispatch(
        notificationAdded({
          type: 'error',
          title: `Erro ao enviar ${previous.fileName}`,
          message: payload.message,
        })
      );
    },
  });
  return () => {
    stopLogout();
    stopUploadFailure();
  };
}
