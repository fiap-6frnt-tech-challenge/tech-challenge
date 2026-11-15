'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { navigation } from '@bytebank/stores';
import { preloadRoute } from '../lib/routePreload';

export function NavigationBridge() {
  const router = useRouter();

  useEffect(
    () =>
      navigation.register({
        navigate: (path) => router.push(path),
        prefetch: (path) => {
          router.prefetch(path);
          preloadRoute(path);
        },
      }),
    [router]
  );

  return null;
}
