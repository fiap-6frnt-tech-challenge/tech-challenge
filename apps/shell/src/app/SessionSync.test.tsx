import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  useSession: vi.fn(),
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

vi.mock('@bytebank/stores', () => ({
  useAppDispatch: () => mocks.dispatch,
  setSession: mocks.setSession,
  clearSession: mocks.clearSession,
}));

import { SessionSync } from './SessionSync';

const fullUser = {
  id: 'u1',
  name: 'Isabela',
  email: 'isabela@example.com',
  image: 'https://example.com/avatar.png',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SessionSync', () => {
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

  it('com sessão nula, despacha clearSession', () => {
    mocks.useSession.mockReturnValue({ data: null, status: 'unauthenticated' });

    SessionSync();

    expect(mocks.clearSession).toHaveBeenCalledTimes(1);
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'auth/clearSession' });
    expect(mocks.setSession).not.toHaveBeenCalled();
  });

  it('durante o loading, não despacha nada', () => {
    mocks.useSession.mockReturnValue({ data: null, status: 'loading' });

    SessionSync();

    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(mocks.clearSession).not.toHaveBeenCalled();
  });
});
