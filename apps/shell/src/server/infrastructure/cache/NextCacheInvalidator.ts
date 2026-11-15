import 'server-only';
import { revalidateTag } from 'next/cache';
import { summaryCacheTag, type CacheInvalidator } from '@bytebank/core/application';

export class NextCacheInvalidator implements CacheInvalidator {
  async invalidateUser(userId: string): Promise<void> {
    revalidateTag(summaryCacheTag(userId), { expire: 0 });
  }
}
