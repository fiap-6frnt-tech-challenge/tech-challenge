'use client';

import { useEffect } from 'react';
import { store, startListening, cancelPendingUploads } from '@bytebank/stores';
import { queryClient } from '@bytebank/api-client';
import { registerEventBridges } from './eventBridges';
import { registerClientListeners, registerPendingUploadWarning } from './clientListeners';

export function ClientEffects() {
  useEffect(() => {
    const stopBridge = registerEventBridges(store);
    const stopListeners = registerClientListeners({
      startListening,
      queryClient,
      cancelUploads: cancelPendingUploads,
    });
    const stopWarning = registerPendingUploadWarning(store, window);
    return () => {
      stopBridge();
      stopListeners();
      stopWarning();
    };
  }, []);
  return null;
}
