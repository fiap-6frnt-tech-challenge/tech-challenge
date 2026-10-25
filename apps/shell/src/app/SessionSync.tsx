'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import {
  useAppDispatch,
  useAppStore,
  setSession,
  clearSession,
  publish,
  logout,
  isClientLogoutInProgress,
} from '@bytebank/stores';
import { isPublicAuthRoute } from './AppShell.routes';

async function isSignedOutOnServer(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/session', { cache: 'no-store' });
    if (!response.ok) return false;
    const session = (await response.json()) as { user?: unknown } | null;
    return !session?.user;
  } catch {
    return false;
  }
}

/**
 * Espelha a sessão do NextAuth no store Redux (authSlice).
 * Não renderiza nada — apenas sincroniza estado.
 */
export function SessionSync() {
  const { data: session, status } = useSession();
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      if (isClientLogoutInProgress() || store.getState().auth.logoutError) return;
      dispatch(
        setSession({
          id: session.user.id ?? '',
          name: session.user.name ?? '',
          email: session.user.email ?? '',
          image: session.user.image ?? undefined,
        })
      );
      return;
    }

    if (!store.getState().auth.isAuthenticated) {
      dispatch(clearSession());
      if (isPublicAuthRoute(pathname)) return;
    }
    if (isClientLogoutInProgress()) return;
    let current = true;
    void isSignedOutOnServer().then((signedOut) => {
      if (!current || !signedOut) return;
      if (store.getState().auth.isAuthenticated) publish({ type: 'session.expired', version: 1 });
      else void dispatch(logout('expired'));
    });
    return () => {
      current = false;
    };
  }, [session, status, dispatch, store, pathname]);

  return null;
}
