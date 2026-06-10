import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  logout: vi.fn(() => ({ type: 'auth/logout' })),
  setLoggingOut: vi.fn(),
  user: {
    id: 'user-1',
    name: 'Ana Souza',
    email: 'ana@bytebank.com',
    image: 'https://example.com/avatar.png',
  },
}));

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useState: vi.fn(() => [false, mocks.setLoggingOut]),
  };
});

vi.mock('@bytebank/design-system', () => ({
  Header: vi.fn(() => null),
  UserMenu: vi.fn(() => null),
}));

vi.mock('@bytebank/stores', () => ({
  logout: mocks.logout,
  selectUser: (state: { auth: { user: typeof mocks.user | null } }) => state.auth.user,
  useAppDispatch: () => mocks.dispatch,
  useAppSelector: (selector: (state: { auth: { user: typeof mocks.user | null } }) => unknown) =>
    selector({ auth: { user: mocks.user } }),
}));

import { Header, UserMenu } from '@bytebank/design-system';
import { AppHeader } from './AppHeader';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AppHeader', () => {
  it('injeta UserMenu com usuário do Redux e despacha logout', async () => {
    const element = AppHeader();
    const userMenu = element.props.actionsSlot;

    expect(element.type).toBe(Header);
    expect(element.props.userName).toBe('Ana Souza');
    expect(userMenu.type).toBe(UserMenu);
    expect(userMenu.props.user).toEqual({
      name: 'Ana Souza',
      email: 'ana@bytebank.com',
      avatarUrl: 'https://example.com/avatar.png',
    });
    expect(userMenu.props.isLoggingOut).toBe(false);

    await userMenu.props.onLogout();

    expect(mocks.setLoggingOut).toHaveBeenCalledWith(true);
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'auth/logout' });
  });
});
