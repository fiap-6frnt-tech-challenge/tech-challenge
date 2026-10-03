'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, UserCircle } from 'lucide-react';
import { Sidebar } from '../Sidebar';
import { useFocusTrap } from '../../hooks';
import type { HeaderProps } from './IHeader';

export function Header({ userName = 'Joana da Silva Oliveira', actionsSlot }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileNavRef = useFocusTrap({ isActive: menuOpen, onEscape: () => setMenuOpen(false) });

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-brand-dark">
        <div className="mx-auto flex h-16 max-w-300 items-center justify-between px-lg">
          <Link href="/" aria-label="Bytebank — página inicial">
            <Image src="/logo.svg" alt="Bytebank" width={120} height={32} priority />
          </Link>

          <div className="hidden sm:flex items-center gap-md text-content-inverse">
            <span className="label-default">{userName}</span>
            {actionsSlot !== undefined ? actionsSlot : <UserCircle size={32} aria-hidden="true" />}
          </div>

          <button
            className="sm:hidden rounded-default p-sm text-content-inverse cursor-pointer"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="z-20 fixed inset-0 sm:hidden h-screen">
          <div
            className="absolute inset-0 bg-content-primary/50 transition-all [animation:backdrop-in_200ms_ease-out]"
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
          />
          <div
            ref={mobileNavRef}
            id="mobile-nav"
            className="fixed inset-0 top-16 z-30 bg-brand-dark sm:hidden h-fit transition-all [animation:drawer-panel-in_200ms_ease-out]"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
          >
            <Sidebar onLinkClick={() => setMenuOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
