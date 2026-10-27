import { afterEach, describe, expect, it, vi } from 'vitest';
import { navigation } from './navigation';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('navigation port', () => {
  it('uses the window location fallback until the shell registers a router', () => {
    const assign = vi.fn();
    vi.stubGlobal('window', { location: { assign } });

    navigation.navigate('/transactions');
    navigation.prefetch('/transactions');

    expect(assign).toHaveBeenCalledExactlyOnceWith('/transactions');
  });

  it('uses the registered implementation and restores the fallback on cleanup', () => {
    const assign = vi.fn();
    const navigate = vi.fn();
    const prefetch = vi.fn();
    vi.stubGlobal('window', { location: { assign } });

    const unregister = navigation.register({ navigate, prefetch });
    navigation.navigate('/transactions');
    navigation.prefetch('/transactions');

    expect(navigate).toHaveBeenCalledExactlyOnceWith('/transactions');
    expect(prefetch).toHaveBeenCalledExactlyOnceWith('/transactions');

    unregister();
    navigation.navigate('/');
    expect(assign).toHaveBeenCalledExactlyOnceWith('/');
  });

  it('does not let an old cleanup replace a newer implementation', () => {
    const first = { navigate: vi.fn(), prefetch: vi.fn() };
    const second = { navigate: vi.fn(), prefetch: vi.fn() };
    const unregisterFirst = navigation.register(first);
    const unregisterSecond = navigation.register(second);

    unregisterFirst();
    navigation.navigate('/transactions');

    expect(first.navigate).not.toHaveBeenCalled();
    expect(second.navigate).toHaveBeenCalledExactlyOnceWith('/transactions');
    unregisterSecond();
  });
});
