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

export function UserMenu({ user, onLogout, className }: UserMenuProps) {
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
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
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
          'flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-border bg-surface',
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
            className={cn(
              'flex w-full items-center gap-sm rounded-default px-sm py-sm text-left label-semibold text-content-primary',
              'transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary'
            )}
          >
            <LogOut aria-hidden="true" size={16} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
