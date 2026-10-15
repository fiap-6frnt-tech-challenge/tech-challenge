'use client';

import { useEffect } from 'react';
import {
  store,
  startListening,
  cancelPendingUploads,
  selectHasPendingUploads,
} from '@bytebank/stores';
import { queryClient } from '@bytebank/api-client';
import { registerEventBridges } from './eventBridges';
import { registerClientListeners } from './clientListeners';

export function ClientEffects() {
  useEffect(() => {
    const stopBridge = registerEventBridges(store);
    const stopListeners = registerClientListeners({
      startListening,
      queryClient,
      cancelUploads: cancelPendingUploads,
    });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!selectHasPendingUploads(store.getState())) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      stopBridge();
      stopListeners();
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, []);
  return null;
}
