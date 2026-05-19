import type { Metadata } from 'next';
import { TransactionsProvider } from '@/context/TransactionsContext';
import { FeedbackProvider } from '@/context/FeedbackContext';
import { Header } from '@/components/ui/Header';
import { Sidebar } from '@/components/ui/Sidebar';
import { ViewportFix } from '@/components/ui/ViewportFix/ViewportFix';
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
        <ViewportFix />
        <FeedbackProvider>
          <TransactionsProvider>
            <div className="flex h-dvh flex-col overflow-hidden">
              <Header />

              {/* Tablet: horizontal nav (full width, above content) */}
              <div className="hidden sm:block lg:hidden bg-background border-b border-border h-fit">
                <div className="mx-auto max-w-300 h-fit">
                  <Sidebar />
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                {/* Desktop + content area */}
                <div className="mx-auto flex max-w-300 flex-col lg:flex-row px-lg gap-lg w-full h-full">
                  {/* Desktop: vertical sidebar */}
                  <div className="hidden lg:block w-48 shrink-0 sticky top-0 self-start">
                    <Sidebar />
                  </div>

                  <main className="w-full py-lg h-full overflow-y-auto">{children}</main>
                </div>
              </div>
            </div>
          </TransactionsProvider>
        </FeedbackProvider>
      </body>
    </html>
  );
}
