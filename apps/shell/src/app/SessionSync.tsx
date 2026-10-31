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
import { afterMfaRecoveryDelivery } from './mfaRecoveryDelivery';
import { isPublicAuthRoute } from './AppShell.routes';
import { isSameUser, toUserSession } from './sessionStore';

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
      const { auth } = store.getState();
      if (isClientLogoutInProgress() || auth.logoutError) return;
      const user = toUserSession(session.user);
      if (auth.sessionEnded || !isSameUser(auth.user, user)) dispatch(setSession(user));
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
      afterMfaRecoveryDelivery(() => {
        if (store.getState().auth.isAuthenticated) publish({ type: 'session.expired', version: 1 });
        else void dispatch(logout('expired'));
      });
    });
    return () => {
      current = false;
    };
  }, [session, status, dispatch, store, pathname]);

  return null;
}
