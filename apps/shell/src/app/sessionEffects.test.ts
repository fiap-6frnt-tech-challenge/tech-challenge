import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { QueryClient } from '@tanstack/react-query';
import type { DomainEvent } from '@bytebank/core';
import { createAppStore, setSession } from '@bytebank/stores';
vi.mock('next-auth/react', () => ({ signOut: vi.fn().mockResolvedValue(undefined) }));
import { signOut } from 'next-auth/react';
import { registerClientListeners } from './clientListeners';
import { registerSessionExpiry } from './sessionEffects';
beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 })));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
describe('session expiry composition', () => {
  it('logs out once for simultaneous 401s, clears state and stops after cleanup', async () => {
    const { store, startListening } = createAppStore();
    const events$ = new Subject<DomainEvent>();
    const queryClient = new QueryClient();
    queryClient.setQueryData(['private'], { balance: 999 });
    store.dispatch(setSession({ id: 'u', name: 'Ana', email: 'ana@example.com' }));
    const stopListeners = registerClientListeners({
      startListening,
      queryClient,
      cancelUploads: () => {},
    });
    const stop = registerSessionExpiry(store, events$);
    events$.next({ type: 'session.expired', version: 1 });
    events$.next({ type: 'session.expired', version: 1 });
    await Promise.resolve();
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login?reason=session-expired' });
    stop();
    store.dispatch(setSession({ id: 'u', name: 'Ana', email: 'ana@example.com' }));
    events$.next({ type: 'session.expired', version: 1 });
    expect(signOut).toHaveBeenCalledTimes(1);
    stopListeners();
  });
});
