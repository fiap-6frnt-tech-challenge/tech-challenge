'use client';

import { useState } from 'react';
import { Header, UserMenu, type HeaderProps } from '@bytebank/design-system';
import {
  ClientSessionEndedError,
  createClientSessionGuard,
  logout,
  navigation,
  selectUser,
  showFeedback,
  useAppDispatch,
  useAppSelector,
} from '@bytebank/stores';
import { httpRequest } from '@bytebank/api-client';

type AppHeaderProps = Pick<HeaderProps, 'onLinkClick' | 'onLinkIntent'>;

export function AppHeader({ onLinkClick, onLinkIntent }: AppHeaderProps = {}) {
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await dispatch(logout());
  };
  const handleLogoutAll = async () => {
    const assertSession = createClientSessionGuard();
    setIsLoggingOut(true);
    try {
      await httpRequest<void>('/auth/sessions/revoke', { method: 'POST' });
      assertSession();
      await dispatch(logout());
    } catch (error) {
      try {
        assertSession();
      } catch {
        return;
      }
      if (!(error instanceof ClientSessionEndedError))
        dispatch(
          showFeedback({
            type: 'error',
            title: 'Não foi possível encerrar as outras sessões',
            message: 'Tente novamente.',
          })
        );
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Header
      userName={user?.name ?? ''}
      onLinkClick={onLinkClick}
      onLinkIntent={onLinkIntent}
      actionsSlot={
        user ? (
          <UserMenu
            user={{ name: user.name, email: user.email, avatarUrl: user.image }}
            onLogout={handleLogout}
            onSecurity={() => navigation.navigate('/settings/security')}
            onLogoutAll={handleLogoutAll}
            isLoggingOut={isLoggingOut}
          />
        ) : null
      }
    />
  );
}
