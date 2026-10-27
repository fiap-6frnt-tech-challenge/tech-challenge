// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), prefetch: vi.fn() },
  register:
    vi.fn<
      (implementation: { navigate(path: string): void; prefetch(path: string): void }) => () => void
    >(),
  preloadRoute: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('@bytebank/stores', () => ({ navigation: { register: mocks.register } }));
vi.mock('../lib/routePreload', () => ({ preloadRoute: mocks.preloadRoute }));

import { NavigationBridge } from './NavigationBridge';

let root: Root;
let container: HTMLDivElement;
const stop = vi.fn();

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  mocks.register.mockReturnValue(stop);
});

afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

it('registers Next navigation and preloads the remote route, then unregisters on unmount', async () => {
  await act(() => root.render(createElement(NavigationBridge)));

  const implementation = mocks.register.mock.calls[0]?.[0];
  expect(implementation).toBeDefined();

  act(() => implementation?.navigate('/transactions'));
  act(() => implementation?.prefetch('/transactions'));

  expect(mocks.router.push).toHaveBeenCalledExactlyOnceWith('/transactions');
  expect(mocks.router.prefetch).toHaveBeenCalledExactlyOnceWith('/transactions');
  expect(mocks.preloadRoute).toHaveBeenCalledExactlyOnceWith('/transactions');

  await act(() => root.unmount());
  expect(stop).toHaveBeenCalledOnce();
});
