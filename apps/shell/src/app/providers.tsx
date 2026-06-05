'use client';

import { Provider } from 'react-redux';
import { SessionProvider } from 'next-auth/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { store } from '@bytebank/stores';
import { queryClient } from '@bytebank/api-client';
import { FeedbackHost } from './FeedbackHost';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <FeedbackHost />
          {/* Renders nothing in production builds (NODE_ENV === 'production'). */}
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        </QueryClientProvider>
      </SessionProvider>
    </Provider>
  );
}
