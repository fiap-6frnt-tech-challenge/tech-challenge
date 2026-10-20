'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@bytebank/design-system';
import { markNavigationStart, whenIdle } from '@bytebank/shared';
import { selectIsAuthenticated, useAppSelector } from '@bytebank/stores';
import { AppHeader } from '../components/AppHeader';
import { preloadLikelyNextRoute, preloadRoute } from '../lib/routePreload';
import { isPublicAuthRoute } from './AppShell.routes';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    return whenIdle(() => preloadLikelyNextRoute(pathname));
  }, [isAuthenticated, pathname]);

  if (isPublicAuthRoute(pathname)) {
    return <div className="h-dvh overflow-y-auto bg-background">{children}</div>;
  }

  const handleLinkIntent = (href: string) => {
    if (isAuthenticated && href !== pathname) preloadRoute(href);
  };

  const handleLinkClick = (href: string) => {
    if (href !== pathname) markNavigationStart(href);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AppHeader onLinkClick={handleLinkClick} onLinkIntent={handleLinkIntent} />

      <div className="hidden sm:block lg:hidden bg-background border-b border-border h-fit">
        <div className="mx-auto max-w-300 h-fit">
          <Sidebar onLinkClick={handleLinkClick} onLinkIntent={handleLinkIntent} />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="mx-auto flex max-w-300 flex-col lg:flex-row px-lg gap-lg w-full h-full">
          <div className="hidden lg:block w-48 shrink-0 sticky top-0 self-start">
            <Sidebar onLinkClick={handleLinkClick} onLinkIntent={handleLinkIntent} />
          </div>

          <main id="main" tabIndex={-1} className="w-full py-lg h-full overflow-y-auto">
            {isAuthenticated ? children : null}
          </main>
        </div>
      </div>
    </div>
  );
}
