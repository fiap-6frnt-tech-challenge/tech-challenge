import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ preload: vi.fn() }));

vi.mock('react-dom', () => ({ preload: mocks.preload }));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-nonce': 'nonce-123' }),
}));

import { preloadRemoteExpose, remoteScripts, type RemoteManifest } from './remotePreload';

const manifestUrl = 'http://localhost:3003/mf-manifest.json';

const manifest: RemoteManifest = {
  metaData: {
    publicPath: 'http://cdn.example.com/transactions/',
    remoteEntry: { name: 'static/js/transactions.abc.js', path: '', type: 'global' },
  },
  exposes: [
    {
      name: 'TransactionsPage',
      assets: { js: { sync: ['static/js/async/792.js', 'static/js/async/expose_Page.js'] } },
    },
    { name: 'AccountOverview', assets: { js: { sync: ['static/js/async/expose_Overview.js'] } } },
  ],
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('remoteScripts', () => {
  it('lista o remote entry e os chunks síncronos do expose, no publicPath do remote', () => {
    expect(remoteScripts(manifest, manifestUrl, 'TransactionsPage')).toEqual([
      'http://cdn.example.com/transactions/static/js/transactions.abc.js',
      'http://cdn.example.com/transactions/static/js/async/792.js',
      'http://cdn.example.com/transactions/static/js/async/expose_Page.js',
    ]);
  });

  it('resolve a partir do manifest quando o publicPath é automático e respeita o path do entry', () => {
    const auto: RemoteManifest = {
      metaData: {
        publicPath: 'auto',
        remoteEntry: { name: 'entry.js', path: './js/', type: 'global' },
      },
    };
    expect(remoteScripts(auto, manifestUrl, 'AccountOverview')).toEqual([
      'http://localhost:3003/js/entry.js',
    ]);
  });

  it('não pré-carrega como script clássico um entry de outro tipo', () => {
    const esm: RemoteManifest = {
      ...manifest,
      metaData: { ...manifest.metaData, remoteEntry: { name: 'entry.mjs', type: 'module' } },
    };
    expect(remoteScripts(esm, manifestUrl, 'AccountOverview')).toEqual([
      'http://cdn.example.com/transactions/static/js/async/expose_Overview.js',
    ]);
  });
});

describe('preloadRemoteExpose', () => {
  it('emite os preloads com o nonce da requisição', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(manifest))
    );

    await preloadRemoteExpose('transactions', 'AccountOverview');

    expect(mocks.preload.mock.calls).toEqual([
      [
        'http://cdn.example.com/transactions/static/js/transactions.abc.js',
        { as: 'script', fetchPriority: 'low', nonce: 'nonce-123' },
      ],
      [
        'http://cdn.example.com/transactions/static/js/async/expose_Overview.js',
        { as: 'script', fetchPriority: 'low', nonce: 'nonce-123' },
      ],
    ]);
  });

  it('não quebra a página quando o manifest não responde', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      })
    );

    await expect(preloadRemoteExpose('transactions', 'AccountOverview')).resolves.toBeUndefined();
    expect(mocks.preload).not.toHaveBeenCalled();
  });
});
