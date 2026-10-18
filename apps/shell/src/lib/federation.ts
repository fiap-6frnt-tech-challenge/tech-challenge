'use client';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Rx from 'rxjs';
import * as DS from '@bytebank/design-system';
import * as Shared from '@bytebank/shared';
import * as Core from '@bytebank/core';
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
          name: 'dashboard',
          entry:
            process.env.NEXT_PUBLIC_DASHBOARD_MFE_URL ?? 'http://localhost:3002/mf-manifest.json',
        },
        {
          name: 'transactions',
          entry:
            process.env.NEXT_PUBLIC_TRANSACTIONS_MFE_URL ??
            'http://localhost:3003/mf-manifest.json',
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
        rxjs: {
          version: '7.8.2',
          scope: 'default',
          lib: () => Rx,
          shareConfig: { singleton: true, requiredVersion: '^7.8.0' },
        },
        '@bytebank/design-system': {
          version: '0.1.0',
          scope: 'default',
          lib: () => DS,
          shareConfig: { singleton: true, requiredVersion: '*' },
        },
        '@bytebank/core': {
          version: '0.1.0',
          scope: 'default',
          lib: () => Core,
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

type RemoteName = 'dashboard' | 'transactions';
type ExposeId = `${RemoteName}/${string}`;

const preloaded = new Set<ExposeId>();

function preloadExpose(id: ExposeId) {
  if (preloaded.has(id) || !Shared.shouldPrefetch()) return;
  preloaded.add(id);
  const [nameOrAlias, expose] = id.split('/');
  ensureInstance()
    .preloadRemote([{ nameOrAlias, exposes: [expose], resourceCategory: 'sync' }])
    .catch((error: unknown) => {
      preloaded.delete(id);
      console.warn(`[federation] preload de ${id} falhou`, error);
    });
}

async function loadExpose(id: ExposeId) {
  const start = performance.now();
  const mod = await ensureInstance().loadRemote<{ default: React.ComponentType }>(id);
  performance.measure(`mf:loadRemote ${id}`, { start });
  if (!mod) throw new Error(`Failed to load remote ${id}`);
  preloaded.add(id);
  return mod.default;
}

export const preloadDashboard = () => preloadExpose('dashboard/Dashboard');
export const preloadTransactionsPage = () => preloadExpose('transactions/TransactionsPage');
export const preloadAccountOverview = () => preloadExpose('transactions/AccountOverview');

export const loadDashboard = () => loadExpose('dashboard/Dashboard');
export const loadTransactionsPage = () => loadExpose('transactions/TransactionsPage');
export const loadAccountOverview = () => loadExpose('transactions/AccountOverview');
