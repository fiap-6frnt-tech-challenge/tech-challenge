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
    } else {
      if (store.getState().auth.isAuthenticated) publish({ type: 'session.expired', version: 1 });
      else {
        dispatch(clearSession());
        if (!isPublicAuthRoute(pathname)) void dispatch(logout('expired'));
      }
    }
  }, [session, status, dispatch, store, pathname]);

  return null;
}
