import { ClientSessionEndedError, createClientSessionGuard, publish } from '@bytebank/stores';

export function createSessionExpiryReporter(): () => void {
  const assertSession = createClientSessionGuard();
  return () => {
    try {
      assertSession();
    } catch (error) {
      if (error instanceof ClientSessionEndedError) return;
      throw error;
    }
    publish({ type: 'session.expired', version: 1 });
  };
}
