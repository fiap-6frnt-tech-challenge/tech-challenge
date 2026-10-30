'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { Session } from 'next-auth';
import { Provider } from 'react-redux';
import { SessionProvider } from 'next-auth/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@bytebank/api-client';
import { FeedbackHost } from './FeedbackHost';
import { NavigationBridge } from './NavigationBridge';
import { SessionSync } from './SessionSync';
import { ClientEffects } from './ClientEffects';
import { SessionActivity } from './SessionActivity';
import { storeForSession } from './sessionStore';

const isDev = process.env.NODE_ENV !== 'production';

const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
  { ssr: false }
);

export function Providers({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  const [store] = useState(() => storeForSession(session));
  return (
    <Provider store={store}>
      <SessionProvider session={session} refetchInterval={60} refetchOnWindowFocus>
        <NavigationBridge />
        <ClientEffects />
        <SessionSync />
        <QueryClientProvider client={queryClient}>
          <SessionActivity />
          {children}
          <FeedbackHost />
          {isDev && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />}
        </QueryClientProvider>
      </SessionProvider>
    </Provider>
  );
}
