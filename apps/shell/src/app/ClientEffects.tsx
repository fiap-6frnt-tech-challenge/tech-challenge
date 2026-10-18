'use client';

import { useEffect } from 'react';
import { store, startListening, cancelPendingUploads } from '@bytebank/stores';
import { queryClient } from '@bytebank/api-client';
import { registerEventBridges } from './eventBridges';
import { registerClientListeners, registerPendingUploadWarning } from './clientListeners';
import { registerSessionExpiry } from './sessionEffects';

export function ClientEffects() {
  useEffect(() => {
    const stopBridge = registerEventBridges(store);
    const stopListeners = registerClientListeners({
      startListening,
      queryClient,
      cancelUploads: cancelPendingUploads,
    });
    const stopWarning = registerPendingUploadWarning(store, window);
    const stopExpiry = registerSessionExpiry(store);
    return () => {
      stopBridge();
      stopListeners();
      stopWarning();
      stopExpiry();
    };
  }, []);
  return null;
}
