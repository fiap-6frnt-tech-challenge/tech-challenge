import type { Metadata } from 'next';
import { ViewportFix } from '@bytebank/design-system';
import { Providers } from './providers';
import { AppShell } from './AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bytebank',
  description: 'Seu banco digital',
};

const dashboardManifestUrl =
  process.env.NEXT_PUBLIC_DASHBOARD_MFE_URL ?? 'http://localhost:3002/mf-manifest.json';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preload" as="fetch" href={dashboardManifestUrl} crossOrigin="anonymous" />
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
