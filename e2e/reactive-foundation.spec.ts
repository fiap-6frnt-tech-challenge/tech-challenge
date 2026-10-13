import { expect, test } from '@playwright/test';
import { login } from './helpers/auth';

test('shares one RxJS event bus across production remotes without fallback chunks', async ({
  page,
  request,
}) => {
  const manifestUrls = [
    process.env.E2E_DASHBOARD_MFE_URL ?? 'http://localhost:3002/mf-manifest.json',
    process.env.E2E_TRANSACTIONS_MFE_URL ?? 'http://localhost:3003/mf-manifest.json',
  ];
  const fallbackUrls = new Set<string>();

  for (const manifestUrl of manifestUrls) {
    const response = await request.get(manifestUrl);
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    const rxjs = manifest.shared.find((entry: { name: string }) => entry.name === 'rxjs');
    expect(rxjs).toBeDefined();
    for (const asset of [...rxjs.assets.js.sync, ...rxjs.assets.js.async] as string[]) {
      fallbackUrls.add(new URL(asset, manifestUrl).href);
    }
  }
  expect(fallbackUrls.size).toBeGreaterThan(0);

  const requestedUrls = new Set<string>();
  page.on('request', (request) => requestedUrls.add(request.url().split('?')[0]));

  await login(page);
  await expect(page.getByRole('heading', { name: 'Transações recentes' }).last()).toBeVisible();
  await page.mouse.wheel(0, 1200);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  const federation = await page.evaluate(async () => {
    type Share = { from: string; loaded: boolean; get: () => Promise<() => unknown> };
    type Registry = Record<string, { default: Record<string, Record<string, Share>> }>;
    const registry = (
      globalThis as typeof globalThis & {
        __FEDERATION__?: { __SHARE__?: Registry };
      }
    ).__FEDERATION__?.__SHARE__;
    if (!registry) throw new Error('Module Federation share scope is unavailable');

    const scopes = ['@bytebank/shell', 'transactions:0.1.0', 'dashboard:0.1.0'];
    async function resolve(scope: string, name: string, version: string) {
      const descriptor = registry![scope]?.default?.[name]?.[version];
      if (!descriptor) throw new Error(`Missing ${name}@${version} in ${scope}`);
      const factory = await descriptor.get();
      return { module: factory(), from: descriptor.from, loaded: descriptor.loaded };
    }

    const rxjs = await Promise.all(scopes.map((scope) => resolve(scope, 'rxjs', '7.8.2')));
    const stores = await Promise.all(
      scopes.map((scope) => resolve(scope, '@bytebank/stores', '0.1.0'))
    );
    const dashboardStores = stores[2].module as typeof import('@bytebank/stores');
    const transactionsStores = stores[1].module as typeof import('@bytebank/stores');
    const received: unknown[] = [];
    const subscription = dashboardStores.domainEvents$.subscribe((event) => received.push(event));
    const event = {
      type: 'transaction.deleted' as const,
      version: 1 as const,
      id: 's2-01-federation-probe',
    };
    try {
      transactionsStores.publish(event);
    } finally {
      subscription.unsubscribe();
    }

    return {
      rxjsFromShell: rxjs.every((entry) => entry.from === '@bytebank/shell' && entry.loaded),
      storesFromShell: stores.every((entry) => entry.from === '@bytebank/shell' && entry.loaded),
      sameRxjs: rxjs.every((entry) => entry.module === rxjs[0].module),
      sameSubject: rxjs.every(
        (entry) =>
          (entry.module as typeof import('rxjs')).Subject ===
          (rxjs[0].module as typeof import('rxjs')).Subject
      ),
      sameStores: stores.every((entry) => entry.module === stores[0].module),
      received,
    };
  });

  expect(federation).toEqual({
    rxjsFromShell: true,
    storesFromShell: true,
    sameRxjs: true,
    sameSubject: true,
    sameStores: true,
    received: [{ type: 'transaction.deleted', version: 1, id: 's2-01-federation-probe' }],
  });
  expect([...requestedUrls].filter((url) => fallbackUrls.has(url))).toEqual([]);
});
