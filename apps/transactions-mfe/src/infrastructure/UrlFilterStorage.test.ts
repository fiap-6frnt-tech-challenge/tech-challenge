// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UrlFilterStorage } from './UrlFilterStorage';

describe('UrlFilterStorage', () => {
  const storage = new UrlFilterStorage();

  beforeEach(() => {
    window.history.replaceState({ __NA: true }, '', '/transactions?type=deposit#lista');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('reads the current URL search params', () => {
    expect(storage.read().get('type')).toBe('deposit');
  });

  it('writes the params to the URL keeping the path and the history state', () => {
    storage.write(new URLSearchParams('type=withdrawal&page=2'));

    expect(window.location.pathname).toBe('/transactions');
    expect(window.location.search).toBe('?type=withdrawal&page=2');
    expect(window.history.state).toEqual({ __NA: true });
  });

  it('clears the query string when writing empty params', () => {
    storage.write(new URLSearchParams());

    expect(window.location.pathname).toBe('/transactions');
    expect(window.location.search).toBe('');
  });

  it('replaces the history entry instead of pushing a new one', () => {
    const length = window.history.length;

    storage.write(new URLSearchParams('q=uber'));

    expect(window.history.length).toBe(length);
  });

  it('notifies subscribers on its own writes and on browser popstate', () => {
    const callback = vi.fn();
    const unsubscribe = storage.subscribe(callback);

    storage.write(new URLSearchParams('q=uber'));
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(callback).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('stops notifying after unsubscribe', () => {
    const callback = vi.fn();
    storage.subscribe(callback)();

    storage.write(new URLSearchParams('q=uber'));

    expect(callback).not.toHaveBeenCalled();
  });
});
