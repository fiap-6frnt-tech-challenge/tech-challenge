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
const transactionsManifestUrl =
  process.env.NEXT_PUBLIC_TRANSACTIONS_MFE_URL ?? 'http://localhost:3003/mf-manifest.json';

function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

const mfeOrigins = [
  ...new Set([originOf(dashboardManifestUrl), originOf(transactionsManifestUrl)]),
].filter((o): o is string => Boolean(o));

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {mfeOrigins.map((origin) => (
          <link key={origin} rel="preconnect" href={origin} crossOrigin="anonymous" />
        ))}
        <link rel="preload" as="fetch" href={dashboardManifestUrl} crossOrigin="anonymous" />
        <link rel="preload" as="fetch" href={transactionsManifestUrl} crossOrigin="anonymous" />
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
