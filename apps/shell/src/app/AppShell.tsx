'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@bytebank/design-system';
import { AppHeader } from '../components/AppHeader';
import { isPublicAuthRoute } from './AppShell.routes';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isPublicAuthRoute(pathname)) {
    return <div className="min-h-dvh bg-background">{children}</div>;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AppHeader />

      <div className="hidden sm:block lg:hidden bg-background border-b border-border h-fit">
        <div className="mx-auto max-w-300 h-fit">
          <Sidebar />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="mx-auto flex max-w-300 flex-col lg:flex-row px-lg gap-lg w-full h-full">
          <div className="hidden lg:block w-48 shrink-0 sticky top-0 self-start">
            <Sidebar />
          </div>

          <main className="w-full py-lg h-full overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
