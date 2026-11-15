import 'server-only';
import { unstable_cache } from 'next/cache';
import type { CacheEntry, ResultCache } from '@bytebank/core/application';

const withStableSource = <T>(load: () => Promise<T>) =>
  Object.assign(() => load(), { toString: () => 'NextResultCache' });

export class NextResultCache implements ResultCache {
  constructor(private readonly ttlSeconds: number) {}

  remember<T>({ key, tags }: CacheEntry, load: () => Promise<T>): Promise<T> {
    return unstable_cache(withStableSource(load), [JSON.stringify(key)], {
      tags: [...tags],
      revalidate: this.ttlSeconds,
    })();
  }
}
