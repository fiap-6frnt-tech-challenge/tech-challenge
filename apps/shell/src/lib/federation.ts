'use client';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as DS from '@bytebank/design-system';
import * as Shared from '@bytebank/shared';
import * as Stores from '@bytebank/stores';
import * as ApiClient from '@bytebank/api-client';
import { createInstance, getInstance } from '@module-federation/enhanced/runtime';

type MFInstance = ReturnType<typeof createInstance>;

let mfInstance: MFInstance | undefined;

/**
 * Garante uma única instância Module Federation viva no shell.
 *
 * Padrão: tenta reusar instância global (resiliente a HMR / re-eval de módulo
 * em dev) antes de criar uma nova. Em prod, módulo é avaliado uma vez e o
 * cache local em `mfInstance` é suficiente.
 *
 * IMPORTANTE — `lib: () => React` (síncrono, retorna o módulo já importado),
 * NÃO `lib: () => import('react')` (assíncrono, retorna Promise). A runtime
 * API do MF espera o módulo direto; passar uma Promise causa duplicação de
 * React e bugs internos tipo "Cannot read 'recentlyCreatedOwnerStacks'".
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
        {
          name: 'dashboard',
          entry:
            process.env.NEXT_PUBLIC_DASHBOARD_MFE_URL ?? 'http://localhost:3002/mf-manifest.json',
        },
      ],
      shared: {
        react: {
          version: '19.2.3',
          scope: 'default',
          lib: () => React,
          shareConfig: { singleton: true, requiredVersion: '^19.0.0' },
        },
        'react-dom': {
          version: '19.2.3',
          scope: 'default',
          lib: () => ReactDOM,
          shareConfig: { singleton: true, requiredVersion: '^19.0.0' },
        },
        '@bytebank/design-system': {
          version: '0.1.0',
          scope: 'default',
          lib: () => DS,
          shareConfig: { singleton: true, requiredVersion: '*' },
        },
        '@bytebank/shared': {
          version: '0.1.0',
          scope: 'default',
          lib: () => Shared,
          shareConfig: { singleton: true, requiredVersion: '*' },
        },
        '@bytebank/stores': {
          version: '0.1.0',
          scope: 'default',
          lib: () => Stores,
          shareConfig: { singleton: true, requiredVersion: '*' },
        },
        '@bytebank/api-client': {
          version: '0.1.0',
          scope: 'default',
          lib: () => ApiClient,
          shareConfig: { singleton: true, requiredVersion: '*' },
        },
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

export async function loadDashboard() {
  const mf = ensureInstance();
  const mod = await mf.loadRemote<{ default: React.ComponentType }>('dashboard/Dashboard');
  if (!mod) throw new Error('Failed to load remote dashboard/Dashboard');
  return mod.default;
}
