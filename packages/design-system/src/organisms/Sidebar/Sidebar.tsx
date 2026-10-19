'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@bytebank/shared';
import type { SidebarProps } from './ISidebar';

const navLinks = [
  { href: '/', label: 'Início' },
  { href: '/transactions', label: 'Transações' },
];

export function Sidebar({ onLinkClick, onLinkIntent, activePath }: SidebarProps) {
  const routerPathname = usePathname();
  const pathname = activePath ?? routerPathname;

  const isSelectedMenu = (pathname: string, href: string) => pathname === href;

  const linkEvents = (href: string) => ({
    onClick: () => onLinkClick?.(href),
    onPointerEnter: () => onLinkIntent?.(href),
    onFocus: () => onLinkIntent?.(href),
  });

  return (
    <nav aria-label="Navegação principal">
      {/* Mobile: vertical list (rendered inside Header drawer) */}
      <ul className="flex flex-col gap-xs px-lg py-lg shadow-card sm:hidden">
        {navLinks.map((link) => {
          const isSelected = isSelectedMenu(pathname, link.href);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                {...linkEvents(link.href)}
                className={cn(
                  'block rounded-default p-md',
                  isSelected ? 'body-semibold' : '',
                  isSelected
                    ? 'border-l-2 border-brand-primary bg-badge-transfer-bg text-content-inverse'
                    : 'text-content-inverse/80 hover:text-content-inverse/80'
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Tablet: horizontal tab bar */}
      <ul className="hidden sm:flex lg:hidden gap-xs px-lg py-sm">
        {navLinks.map((link) => {
          const isSelected = isSelectedMenu(pathname, link.href);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                {...linkEvents(link.href)}
                className={cn(
                  'block rounded-default px-md py-sm',
                  isSelected ? 'body-semibold' : '',
                  isSelected
                    ? 'border-l-2 border-brand-primary bg-badge-transfer-bg text-brand-primary'
                    : 'text-content-primary hover:text-brand-primary'
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Desktop: vertical sidebar */}
      <ul className="hidden lg:flex flex-col gap-xs pt-lg">
        {navLinks.map((link) => {
          const isSelected = isSelectedMenu(pathname, link.href);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                {...linkEvents(link.href)}
                className={cn(
                  'block rounded-default px-md py-sm',
                  isSelected ? 'body-semibold' : '',
                  isSelected
                    ? 'border-l-2 border-brand-primary bg-badge-transfer-bg text-brand-primary'
                    : 'text-content-primary hover:text-brand-primary'
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
