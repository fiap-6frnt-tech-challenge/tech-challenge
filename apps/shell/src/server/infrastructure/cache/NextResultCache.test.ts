import { beforeEach, describe, expect, it, vi } from 'vitest';

const next = vi.hoisted(() => ({
  unstable_cache: vi.fn<
    (load: () => Promise<unknown>, keyParts: string[], options: unknown) => typeof load
  >((load) => load),
}));

vi.mock('next/cache', () => next);

import { NextResultCache } from './NextResultCache';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NextResultCache', () => {
  it('caches with the whole key as one part, the tags and the TTL', async () => {
    const load = vi.fn(async () => ({ balance: 10 }));

    await expect(
      new NextResultCache(300).remember(
        { key: ['summary', 'user-a', '2026-01-01', '2026-06-30', 'v1'], tags: ['summary:user-a'] },
        load
      )
    ).resolves.toEqual({ balance: 10 });

    expect(load).toHaveBeenCalledTimes(1);
    expect(next.unstable_cache).toHaveBeenCalledWith(
      expect.any(Function),
      ['["summary","user-a","2026-01-01","2026-06-30","v1"]'],
      { tags: ['summary:user-a'], revalidate: 300 }
    );
  });

  it('hands Next the same function source for every caller, so the route and the page share entries', async () => {
    const cache = new NextResultCache(300);
    const entry = { key: ['summary'], tags: [] };

    await cache.remember(entry, async () => 'from the route');
    await cache.remember(entry, () => Promise.resolve('from the page'));

    const [first, second] = next.unstable_cache.mock.calls.map(([cb]) => cb.toString());
    expect(first).toBe(second);
  });

  it('keeps keys with commas apart', async () => {
    const cache = new NextResultCache(300);
    const load = async () => null;

    await cache.remember({ key: ['summary', 'u', 'a,b', 'c'], tags: [] }, load);
    await cache.remember({ key: ['summary', 'u', 'a', 'b,c'], tags: [] }, load);

    const [first, second] = next.unstable_cache.mock.calls.map(([, keyParts]) => keyParts);
    expect(first).not.toEqual(second);
  });
});
