import { describe, expect, it, vi } from 'vitest';

const next = vi.hoisted(() => ({ revalidateTag: vi.fn() }));

vi.mock('next/cache', () => next);

import { NextCacheInvalidator } from './NextCacheInvalidator';

describe('NextCacheInvalidator', () => {
  it('expires the user summary tag immediately, not stale-while-revalidate', async () => {
    await new NextCacheInvalidator().invalidateUser('user-a');

    expect(next.revalidateTag).toHaveBeenCalledWith('summary:user-a', { expire: 0 });
  });
});
