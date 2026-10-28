'use client';

import { cn } from '@bytebank/shared';
import { LogOut } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { UserMenuProps } from './IUserMenu';

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function UserMenu({
  user,
  onLogout,
  onLogoutAll,
  onSecurity,
  isLoggingOut = false,
  className,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const logoutRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      logoutRef.current?.focus();
    }
  }, [isOpen]);

  if (!user) {
    return null;
  }

  const closeMenu = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen((current) => !current);
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        'button[role="menuitem"]:not(:disabled)'
      )
    );
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && items.length) {
      event.preventDefault();
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const initials = getInitials(user.name);

  return (
    <div className={cn('relative inline-flex', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Abrir menu do usuário"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'cursor-pointer',
          'flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-surface',
          'label-semibold text-content-primary transition-colors hover:bg-surface-hover',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary'
        )}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10 cursor-default bg-transparent"
            onClick={closeMenu}
            aria-hidden="true"
          />

          <div
            id={menuId}
            role="menu"
            aria-label="Menu do usuário"
            onKeyDown={handleMenuKeyDown}
            className={cn(
              'absolute right-0 top-full z-20 mt-sm flex w-72 flex-col gap-sm rounded-default border border-border bg-surface p-sm shadow-card'
            )}
          >
            <div className="border-b border-border pb-sm" role="none">
              <p className="body-semibold text-content-primary">{user.name}</p>
              <p className="label-default break-all text-content-secondary">{user.email}</p>
            </div>

            <button
              ref={logoutRef}
              type="button"
              role="menuitem"
              onClick={onLogout}
              disabled={isLoggingOut}
              aria-busy={isLoggingOut || undefined}
              className={cn(
                'flex w-full items-center gap-sm rounded-default px-sm py-sm text-left label-semibold text-content-primary',
                'transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
                'disabled:cursor-not-allowed disabled:opacity-60'
              )}
            >
              <LogOut aria-hidden="true" size={16} />
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </button>
            {onSecurity && (
              <button
                type="button"
                role="menuitem"
                disabled={isLoggingOut}
                onClick={() => {
                  closeMenu();
                  onSecurity();
                }}
                className="flex w-full items-center gap-sm rounded-default px-sm py-sm text-left label-semibold text-content-primary hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-60"
              >
                Segurança da conta
              </button>
            )}
            {onLogoutAll && (
              <button
                type="button"
                role="menuitem"
                onClick={onLogoutAll}
                disabled={isLoggingOut}
                className="flex w-full items-center gap-sm rounded-default px-sm py-sm text-left label-semibold text-content-primary hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-60"
              >
                Sair de todos os dispositivos
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
