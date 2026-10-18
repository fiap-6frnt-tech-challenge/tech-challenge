import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('next-auth/react', () => ({ signOut: vi.fn() }));

import { signOut } from 'next-auth/react';
import authReducer, { setSession, clearSession, logout, type UserSession } from './authSlice';

const initialState = { user: null, isAuthenticated: false };
beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 })));
afterEach(() => vi.unstubAllGlobals());

const fakeUser: UserSession = {
  id: 'u1',
  name: 'Isabela',
  email: 'isabela@example.com',
};

describe('authSlice', () => {
  it('does not claim remote logout succeeded when current-session revocation fails and permits retry', async () => {
    vi.mocked(signOut).mockClear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const store = configureStore({ reducer: { auth: authReducer } });
    const failed = await store.dispatch(logout());
    expect(failed.meta.requestStatus).toBe('rejected');
    expect(signOut).not.toHaveBeenCalled();
    expect(store.getState().auth.logoutError).toBe(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));
    const retry = await store.dispatch(logout());
    expect(retry.meta.requestStatus).toBe('fulfilled');
    expect(signOut).toHaveBeenCalledTimes(1);
  });
  it('deduplicates simultaneous logout requests even before the session provider updates', async () => {
    let finish!: () => void;
    vi.mocked(signOut).mockClear();
    vi.mocked(signOut).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const store = configureStore({ reducer: { auth: authReducer } });
    const first = store.dispatch(logout());
    const second = store.dispatch(logout());
    await Promise.resolve();
    expect(signOut).toHaveBeenCalledTimes(1);
    finish();
    await Promise.all([first, second]);
  });
  it('deve inicializar deslogado', () => {
    const state = authReducer(undefined, { type: '@@INIT' });
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('setSession com usuário marca como autenticado', () => {
    const state = authReducer(initialState, setSession(fakeUser));
    expect(state.user).toEqual(fakeUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('setSession com null limpa a autenticação', () => {
    const logged = { user: fakeUser, isAuthenticated: true };
    const state = authReducer(logged, setSession(null));
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('clearSession reseta a sessão', () => {
    const logged = { user: fakeUser, isAuthenticated: true };
    const state = authReducer(logged, clearSession());
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('logout.fulfilled limpa a sessão', () => {
    const logged = { user: fakeUser, isAuthenticated: true };
    const state = authReducer(logged, { type: logout.fulfilled.type });
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('logout dispara signOut com callbackUrl e limpa a sessão', async () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { user: fakeUser, isAuthenticated: true } },
    });

    await store.dispatch(logout());

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' });
    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });
});
