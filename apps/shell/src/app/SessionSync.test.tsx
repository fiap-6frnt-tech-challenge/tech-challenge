import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  useSession: vi.fn(),
  pathname: vi.fn(() => '/login'),
  isAuthenticated: false,
  logoutInProgress: false,
  publish: vi.fn(),
  logout: vi.fn((reason: string) => ({ type: 'auth/logout', payload: reason })),
  setSession: vi.fn((payload: unknown) => ({ type: 'auth/setSession', payload })),
  clearSession: vi.fn(() => ({ type: 'auth/clearSession' })),
}));

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useEffect: (cb: () => void) => cb(),
  };
});

vi.mock('next-auth/react', () => ({ useSession: mocks.useSession }));
vi.mock('next/navigation', () => ({ usePathname: mocks.pathname }));

vi.mock('@bytebank/stores', () => ({
  useAppStore: () => ({ getState: () => ({ auth: { isAuthenticated: mocks.isAuthenticated } }) }),
  publish: mocks.publish,
  logout: mocks.logout,
  isClientLogoutInProgress: () => mocks.logoutInProgress,
  useAppDispatch: () => mocks.dispatch,
  setSession: mocks.setSession,
  clearSession: mocks.clearSession,
}));

import { beginMfaRecoveryDelivery } from './mfaRecoveryDelivery';
import { SessionSync } from './SessionSync';

const fullUser = {
  id: 'u1',
  name: 'Isabela',
  email: 'isabela@example.com',
  image: 'https://example.com/avatar.png',
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function serverSession(response: () => Promise<Response>) {
  const fetchMock = vi.fn(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname.mockReturnValue('/login');
  mocks.isAuthenticated = false;
  mocks.logoutInProgress = false;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SessionSync', () => {
  it('keeps one-time recovery delivery visible after an old session poll completes', async () => {
    mocks.isAuthenticated = true;
    mocks.pathname.mockReturnValue('/settings/security');
    mocks.useSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    serverSession(async () => Response.json(null));
    const release = beginMfaRecoveryDelivery();
    SessionSync();
    await flush();
    expect(mocks.publish).not.toHaveBeenCalled();
    release();
    expect(mocks.publish).toHaveBeenCalledWith({ type: 'session.expired', version: 1 });
  });
  it('ends an invalid session on an initial private-page load instead of leaving an empty screen', async () => {
    const fetchMock = serverSession(async () => Response.json(null));
    mocks.pathname.mockReturnValue('/transactions');
    mocks.useSession.mockReturnValue({ data: null, status: 'unauthenticated' });

    SessionSync();
    await flush();

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', { cache: 'no-store' });
    expect(mocks.logout).toHaveBeenCalledWith('expired');
  });

  it.each([
    [
      'the session check is aborted by a navigation',
      () => Promise.reject(new TypeError('aborted')),
    ],
    ['the session endpoint fails', async () => new Response(null, { status: 503 })],
    ['the server still has the user', async () => Response.json({ user: fullUser })],
  ])('keeps the session on a private page when %s', async (_case, response) => {
    serverSession(response);
    mocks.pathname.mockReturnValue('/transactions');
    mocks.useSession.mockReturnValue({ data: null, status: 'unauthenticated' });

    SessionSync();
    await flush();

    expect(mocks.logout).not.toHaveBeenCalled();
  });

  it('expires a signed-in user only after the server confirms there is no session', async () => {
    mocks.isAuthenticated = true;
    mocks.pathname.mockReturnValue('/');
    mocks.useSession.mockReturnValue({ data: null, status: 'unauthenticated' });

    serverSession(() => Promise.reject(new TypeError('aborted')));
    SessionSync();
    await flush();
    expect(mocks.publish).not.toHaveBeenCalled();

    serverSession(async () => Response.json({}));
    SessionSync();
    await flush();
    expect(mocks.publish).toHaveBeenCalledWith({ type: 'session.expired', version: 1 });
    expect(mocks.clearSession).not.toHaveBeenCalled();
  });

  it('does not start a second logout while the user is already signing out', async () => {
    const fetchMock = serverSession(async () => Response.json(null));
    mocks.logoutInProgress = true;
    mocks.pathname.mockReturnValue('/');
    mocks.useSession.mockReturnValue({ data: null, status: 'unauthenticated' });

    SessionSync();
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.logout).not.toHaveBeenCalled();
  });

  it('não renderiza nada (retorna null)', () => {
    mocks.useSession.mockReturnValue({ data: null, status: 'loading' });
    expect(SessionSync()).toBeNull();
  });

  it('com sessão presente, despacha setSession com os campos do usuário', () => {
    mocks.useSession.mockReturnValue({ data: { user: fullUser }, status: 'authenticated' });

    SessionSync();

    expect(mocks.setSession).toHaveBeenCalledWith({
      id: 'u1',
      name: 'Isabela',
      email: 'isabela@example.com',
      image: 'https://example.com/avatar.png',
    });
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: 'auth/setSession',
      payload: {
        id: 'u1',
        name: 'Isabela',
        email: 'isabela@example.com',
        image: 'https://example.com/avatar.png',
      },
    });
    expect(mocks.clearSession).not.toHaveBeenCalled();
  });

  it('normaliza campos ausentes do usuário para "" / undefined', () => {
    mocks.useSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' });

    SessionSync();

    expect(mocks.setSession).toHaveBeenCalledWith({
      id: '',
      name: '',
      email: '',
      image: undefined,
    });
  });

  it('com sessão nula numa rota pública, despacha clearSession sem consultar o servidor', async () => {
    const fetchMock = serverSession(async () => Response.json(null));
    mocks.useSession.mockReturnValue({ data: null, status: 'unauthenticated' });

    SessionSync();
    await flush();

    expect(mocks.clearSession).toHaveBeenCalledTimes(1);
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'auth/clearSession' });
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.logout).not.toHaveBeenCalled();
  });

  it('durante o loading, não despacha nada', () => {
    mocks.useSession.mockReturnValue({ data: null, status: 'loading' });

    SessionSync();

    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(mocks.clearSession).not.toHaveBeenCalled();
  });
});
