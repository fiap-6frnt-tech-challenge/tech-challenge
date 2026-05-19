'use client';

import { createInstance, getInstance } from '@module-federation/enhanced/runtime';

type MFInstance = ReturnType<typeof createInstance>;

let mfInstance: MFInstance | undefined;

/**
 * Garante uma única instância Module Federation viva no shell.
 *
 * Padrão: tenta reusar instância global (resiliente a HMR / re-eval de módulo
 * em dev) antes de criar uma nova. Em prod, módulo é avaliado uma vez e o
 * cache local em `mfInstance` é suficiente.
 */
function ensureInstance(): MFInstance {
  if (mfInstance) return mfInstance;

  mfInstance =
    getInstance() ??
    createInstance({
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

  return mfInstance;
}

export async function loadHello() {
  const mf = ensureInstance();
  const mod = await mf.loadRemote<{ default: React.ComponentType }>('hello/Hello');
  if (!mod) throw new Error('Failed to load remote hello/Hello');
  return mod.default;
}
