'use client';

import { init, loadRemote } from '@module-federation/enhanced/runtime';

let initialized = false;

function ensureInit() {
  if (initialized) return;
  initialized = true;
  init({
    name: '@bytebank/shell',
    remotes: [
      {
        name: 'hello',
        entry: process.env.NEXT_PUBLIC_HELLO_MFE_URL ?? 'http://localhost:3001/mf-manifest.json',
      },
    ],
    shared: {
      react: {
        version: '19.2.3',
        scope: 'default',
        lib: () => import('react'),
        shareConfig: { singleton: true, requiredVersion: '^19.0.0' },
      },
      'react-dom': {
        version: '19.2.3',
        scope: 'default',
        lib: () => import('react-dom'),
        shareConfig: { singleton: true, requiredVersion: '^19.0.0' },
      },
      // TODO (Task 6 dia 2, após Tasks 3+4 mergearem):
      // Adicionar singletons de @bytebank/design-system e @bytebank/shared.
      // Sem eles, DS pode duplicar entre shell e remote (2x bundle + risco Context bugs).
      // Ver docs/phase-2/sprint-0/06-poc-module-federation.md seção B2 para config completa.
    },
  });
}

export async function loadHello() {
  ensureInit();
  const mod = await loadRemote<{ default: React.ComponentType }>('hello/Hello');
  if (!mod) throw new Error('Failed to load remote hello/Hello');
  return mod.default;
}
