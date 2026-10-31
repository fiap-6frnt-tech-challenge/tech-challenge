import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('next-auth/react', () => ({ signOut: vi.fn() }));

import { signOut } from 'next-auth/react';
import authReducer, {
  setSession,
  clearSession,
  logout,
  selectSessionEnded,
  type UserSession,
} from './authSlice';

const initialState = { user: null, isAuthenticated: false };
const assign = vi.fn();

function stubNetwork({ revokeOk = true, activeSessionChecks = 0 } = {}) {
  let remaining = activeSessionChecks;
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/auth/sessions/current/revoke')
      return { ok: revokeOk, status: revokeOk ? 204 : 503 };
    const active = remaining > 0;
    remaining -= 1;
    return { ok: true, status: 200, json: async () => (active ? { user: { id: 'u1' } } : null) };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  stubNetwork();
  assign.mockClear();
  vi.mocked(signOut).mockClear();
  vi.stubGlobal('window', { location: { assign } });
});
afterEach(() => vi.unstubAllGlobals());

const fakeUser: UserSession = {
  id: 'u1',
  name: 'Isabela',
  email: 'isabela@example.com',
};

describe('authSlice', () => {
  it('does not claim remote logout succeeded when current-session revocation fails and permits retry', async () => {
    stubNetwork({ revokeOk: false });
    const store = configureStore({ reducer: { auth: authReducer } });
    const failed = await store.dispatch(logout());
    expect(failed.meta.requestStatus).toBe('rejected');
    expect(signOut).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
    expect(store.getState().auth.logoutError).toBe(true);
    stubNetwork();
    const retry = await store.dispatch(logout());
    expect(retry.meta.requestStatus).toBe('fulfilled');
    expect(signOut).toHaveBeenCalledTimes(1);
  });
  it('signs out again when a late session refresh restored the cookie, then navigates once', async () => {
    const fetchMock = stubNetwork({ activeSessionChecks: 1 });
    const store = configureStore({ reducer: { auth: authReducer } });

    const result = await store.dispatch(logout('idle'));

    expect(result.meta.requestStatus).toBe('fulfilled');
    expect(signOut).toHaveBeenCalledTimes(2);
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', { cache: 'no-store' });
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith('/login?reason=inactive');
  });
  it('reports the logout as failed when the session keeps coming back', async () => {
    stubNetwork({ activeSessionChecks: 3 });
    const store = configureStore({ reducer: { auth: authReducer } });

    const result = await store.dispatch(logout());

    expect(result.meta.requestStatus).toBe('rejected');
    expect(signOut).toHaveBeenCalledTimes(3);
    expect(assign).not.toHaveBeenCalled();
    expect(store.getState().auth.logoutError).toBe(true);
  });
  it('deduplicates simultaneous logout requests even before the session provider updates', async () => {
    let finish!: () => void;
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

  it('só marca a sessão como encerrada quando o cliente sabe que ela acabou', () => {
    const ended = (state: ReturnType<typeof authReducer>) => selectSessionEnded({ auth: state });
    const unknown = authReducer(undefined, { type: '@@INIT' });
    expect(ended(unknown)).toBe(false);
    expect(ended(authReducer(unknown, setSession(fakeUser)))).toBe(false);
    expect(ended(authReducer(unknown, setSession(null)))).toBe(true);
    expect(ended(authReducer(unknown, clearSession()))).toBe(true);
    expect(ended(authReducer(unknown, { type: logout.pending.type }))).toBe(true);
    const failed = authReducer(authReducer(unknown, { type: logout.pending.type }), {
      type: logout.rejected.type,
    });
    expect(ended(failed)).toBe(true);
    expect(ended(authReducer(authReducer(unknown, clearSession()), setSession(fakeUser)))).toBe(
      false
    );
  });

  it('logout limpa o cookie, confere a sessão, navega para o login e limpa o estado', async () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { user: fakeUser, isAuthenticated: true } },
    });

    await store.dispatch(logout());

    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(assign).toHaveBeenCalledWith('/login');
    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });
});
