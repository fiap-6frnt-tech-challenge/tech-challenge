import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { QueryClient } from '@tanstack/react-query';
import type { DomainEvent } from '@bytebank/core';
import { createAppStore, setSession } from '@bytebank/stores';
vi.mock('next-auth/react', () => ({ signOut: vi.fn().mockResolvedValue(undefined) }));
import { signOut } from 'next-auth/react';
import { registerClientListeners } from './clientListeners';
import { registerSessionExpiry } from './sessionEffects';
import { beginMfaRecoveryDelivery } from './mfaRecoveryDelivery';
const assign = vi.fn();
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url === '/api/auth/session'
        ? { ok: true, status: 200, json: async () => null }
        : { ok: true, status: 204 }
    )
  );
  vi.stubGlobal('window', { location: { assign } });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
describe('session expiry composition', () => {
  it('defers expiry navigation only until the one-time recovery delivery is acknowledged', async () => {
    const { store } = createAppStore();
    store.dispatch(setSession({ id: 'u', name: 'Ana', email: 'ana@example.com' }));
    const events$ = new Subject<DomainEvent>();
    const stop = registerSessionExpiry(store, events$);
    const release = beginMfaRecoveryDelivery();
    events$.next({ type: 'session.expired', version: 1 });
    await Promise.resolve();
    expect(signOut).not.toHaveBeenCalled();
    release();
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/login?reason=session-expired'));
    expect(signOut).toHaveBeenCalledOnce();
    release();
    expect(signOut).toHaveBeenCalledOnce();
    stop();
  });
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
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/login?reason=session-expired'));
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    stop();
    store.dispatch(setSession({ id: 'u', name: 'Ana', email: 'ana@example.com' }));
    events$.next({ type: 'session.expired', version: 1 });
    expect(signOut).toHaveBeenCalledTimes(1);
    stopListeners();
  });
});
