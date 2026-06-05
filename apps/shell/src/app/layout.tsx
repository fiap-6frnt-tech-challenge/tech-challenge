import type { Metadata } from 'next';
import { ViewportFix } from '@bytebank/design-system';
import { Providers } from './providers';
import { AppShell } from './AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bytebank',
  description: 'Seu banco digital',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Preload LCP image */}
        <link rel="preload" as="image" href="/piggy-bank.png" type="image/png" />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <ViewportFix />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
