'use client';

import dynamic from 'next/dynamic';
import { Provider } from 'react-redux';
import { SessionProvider } from 'next-auth/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '@bytebank/stores';
import { queryClient } from '@bytebank/api-client';
import { FeedbackHost } from './FeedbackHost';
import { SessionSync } from './SessionSync';

const isDev = process.env.NODE_ENV !== 'production';

const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionProvider>
        <SessionSync />
        <QueryClientProvider client={queryClient}>
          {children}
          <FeedbackHost />
          {isDev && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />}
        </QueryClientProvider>
      </SessionProvider>
    </Provider>
  );
}
