'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAppDispatch, setSession, clearSession } from '@bytebank/stores';

/**
 * Espelha a sessão do NextAuth no store Redux (authSlice).
 * Não renderiza nada — apenas sincroniza estado.
 */
export function SessionSync() {
  const { data: session, status } = useSession();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      dispatch(
        setSession({
          id: session.user.id ?? '',
          name: session.user.name ?? '',
          email: session.user.email ?? '',
          image: session.user.image ?? undefined,
        })
      );
    } else {
      dispatch(clearSession());
    }
  }, [session, status, dispatch]);

  return null;
}
