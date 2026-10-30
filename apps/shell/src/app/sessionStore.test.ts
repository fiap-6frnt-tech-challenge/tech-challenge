import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

const session: Session = {
  user: { id: 'u1', name: 'Isabela', email: 'isabela@example.com' },
  expires: '2099-01-01T00:00:00.000Z',
};

async function load() {
  const stores = await import('@bytebank/stores');
  const { storeForSession } = await import('./sessionStore');
  return { stores, storeForSession };
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe('storeForSession', () => {
  it('no servidor, cria um store por requisição e nunca semeia o singleton', async () => {
    const { stores, storeForSession } = await load();

    const first = storeForSession(session);
    const second = storeForSession(null);

    expect(first).not.toBe(stores.store);
    expect(second).not.toBe(first);
    expect(stores.selectUser(first.getState())?.email).toBe('isabela@example.com');
    expect(stores.selectIsAuthenticated(second.getState())).toBe(false);
    expect(stores.selectIsAuthenticated(stores.store.getState())).toBe(false);
  });

  it('no cliente, semeia o singleton uma única vez antes do primeiro render', async () => {
    vi.stubGlobal('window', {});
    const { stores, storeForSession } = await load();

    expect(storeForSession(session)).toBe(stores.store);
    expect(stores.selectUser(stores.store.getState())?.id).toBe('u1');
    expect(stores.selectSessionEnded(stores.store.getState())).toBe(false);

    stores.store.dispatch(stores.clearSession());
    expect(storeForSession(session)).toBe(stores.store);
    expect(stores.selectIsAuthenticated(stores.store.getState())).toBe(false);
    expect(stores.selectSessionEnded(stores.store.getState())).toBe(true);
  });

  it('sem sessão, deixa o estado desconhecido em vez de encerrado', async () => {
    vi.stubGlobal('window', {});
    const { stores, storeForSession } = await load();

    storeForSession(null);

    expect(stores.selectIsAuthenticated(stores.store.getState())).toBe(false);
    expect(stores.selectSessionEnded(stores.store.getState())).toBe(false);
  });
});
