'use client';

import { useState } from 'react';
import { Header, UserMenu, type HeaderProps } from '@bytebank/design-system';
import { logout, selectUser, useAppDispatch, useAppSelector } from '@bytebank/stores';

type AppHeaderProps = Pick<HeaderProps, 'onLinkClick' | 'onLinkIntent'>;

export function AppHeader({ onLinkClick, onLinkIntent }: AppHeaderProps = {}) {
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await dispatch(logout());
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
            isLoggingOut={isLoggingOut}
          />
        ) : null
      }
    />
  );
}
