import type { NavigationPort } from '@bytebank/core/application';

const fallback: NavigationPort = {
  navigate: (path) => window.location.assign(path),
  prefetch: () => {},
};

let current: NavigationPort = fallback;

export const navigation = {
  register(implementation: NavigationPort): () => void {
    current = implementation;

    return () => {
      if (current === implementation) current = fallback;
    };
  },
  navigate(path: string): void {
    current.navigate(path);
  },
  prefetch(path: string): void {
    current.prefetch(path);
  },
};
