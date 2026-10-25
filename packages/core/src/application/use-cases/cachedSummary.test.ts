import { describe, expect, it, vi } from 'vitest';
import type { Transaction } from '../../domain';
import {
  FakeCacheInvalidator,
  FakeClock,
  InMemoryResultCache,
  InMemoryTransactionRepository,
  SequentialIdGenerator,
} from '../testing';
import { CachedGetTransactionsSummary, GetTransactionsSummary, summaryCacheTag } from './dashboard';
import { CreateTransaction } from './transactions';

const range = { from: '2026-01-01', to: '2026-06-30' };

function deposit(id: string, userId: string, amount: number): Transaction {
  return {
    id,
    userId,
    type: 'deposit',
    category: 'salary',
    amount,
    date: '2026-03-10',
    description: id,
  };
}

function setup(rows: Transaction[] = []) {
  const repository = new InMemoryTransactionRepository(rows);
  const cache = new InMemoryResultCache();
  const summary = new GetTransactionsSummary(repository);
  const compute = vi.spyOn(summary, 'execute');
  const cached = new CachedGetTransactionsSummary(summary, repository, cache);
  return { repository, cache, compute, cached };
}

describe('CachedGetTransactionsSummary', () => {
  it('serves the second request for the same user and range from the cache', async () => {
    const { cache, compute, cached } = setup([deposit('a1', 'user-a', 100)]);

    const first = await cached.execute({ userId: 'user-a' }, range);
    const second = await cached.execute({ userId: 'user-a' }, range);

    expect(second).toEqual(first);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(cache.hits).toBe(1);
  });

  it('keys by user, range and data version, tagged by user', async () => {
    const { cache, repository, cached } = setup([deposit('a1', 'user-a', 100)]);
    const version = await repository.version('user-a');

    await cached.execute({ userId: 'user-a' }, range);
    await cached.execute({ userId: 'user-a' });

    expect(cache.keys()).toEqual([
      ['summary', 'user-a', '2026-01-01', '2026-06-30', version],
      ['summary', 'user-a', '', '', version],
    ]);
    expect(summaryCacheTag('user-a')).toBe('summary:user-a');
  });

  it('never serves one user the summary cached for another', async () => {
    const { compute, cached } = setup([deposit('a1', 'user-a', 100), deposit('b1', 'user-b', 7)]);

    const forA = await cached.execute({ userId: 'user-a' }, range);
    const forB = await cached.execute({ userId: 'user-b' }, range);

    expect(forA.balance).toBe(100);
    expect(forB.balance).toBe(7);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('recomputes after a mutation even before the tag invalidation lands', async () => {
    const { repository, compute, cached } = setup([deposit('a1', 'user-a', 100)]);
    const clock = new FakeClock(new Date('2026-06-30T12:00:00Z'));
    const create = new CreateTransaction(
      repository,
      clock,
      new SequentialIdGenerator('tx'),
      new FakeCacheInvalidator()
    );

    expect((await cached.execute({ userId: 'user-a' }, range)).balance).toBe(100);
    await create.execute(
      { userId: 'user-a' },
      { type: 'deposit', category: 'salary', amount: 50, date: '2026-06-29', description: 'Bônus' }
    );

    expect((await cached.execute({ userId: 'user-a' }, range)).balance).toBe(150);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('drops the user entries when the user tag is invalidated', async () => {
    const { cache, compute, cached } = setup([
      deposit('a1', 'user-a', 100),
      deposit('b1', 'user-b', 7),
    ]);
    await cached.execute({ userId: 'user-a' }, range);
    await cached.execute({ userId: 'user-b' }, range);

    cache.invalidateTag(summaryCacheTag('user-a'));
    await cached.execute({ userId: 'user-a' }, range);
    await cached.execute({ userId: 'user-b' }, range);

    expect(compute).toHaveBeenCalledTimes(3);
    expect(cache.hits).toBe(1);
  });
});
