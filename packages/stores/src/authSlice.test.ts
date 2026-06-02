import { describe, it, expect, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('next-auth/react', () => ({ signOut: vi.fn() }));

import { signOut } from 'next-auth/react';
import authReducer, { setSession, clearSession, logout, type UserSession } from './authSlice';

const initialState = { user: null, isAuthenticated: false };

const fakeUser: UserSession = {
  id: 'u1',
  name: 'Isabela',
  email: 'isabela@example.com',
};

describe('authSlice', () => {
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
