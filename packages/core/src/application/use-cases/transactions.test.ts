import { describe, expect, it } from 'vitest';
import { NotFoundError, ValidationError } from '../../domain';
import { FakeClock, InMemoryTransactionRepository, SequentialIdGenerator } from '../testing';
import {
  CreateTransaction,
  DeleteTransaction,
  GetTransaction,
  ListTransactions,
  UpdateTransaction,
} from './transactions';

const ownedByA = {
  id: 'tx-a',
  userId: 'user-a',
  type: 'deposit' as const,
  category: 'salary',
  amount: 100,
  date: '2025-01-10',
  description: 'Salário',
};

describe('transaction use cases enforce ownership', () => {
  it('hides another actor transaction on get', async () => {
    const useCase = new GetTransaction(new InMemoryTransactionRepository([ownedByA]));
    await expect(useCase.execute({ userId: 'user-b' }, 'tx-a')).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it('hides another actor transaction on update', async () => {
    const useCase = new UpdateTransaction(new InMemoryTransactionRepository([ownedByA]));
    await expect(
      useCase.execute({ userId: 'user-b' }, 'tx-a', { description: 'Mudança' })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('hides another actor transaction on delete', async () => {
    const useCase = new DeleteTransaction(new InMemoryTransactionRepository([ownedByA]));
    await expect(useCase.execute({ userId: 'user-b' }, 'tx-a')).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});

describe('transaction use cases happy paths and validation', () => {
  it('creates a transaction for the actor with a generated id', async () => {
    const repository = new InMemoryTransactionRepository();
    const clock = new FakeClock(new Date());
    const useCase = new CreateTransaction(repository, clock, new SequentialIdGenerator('tx'));
    const result = await useCase.execute(
      { userId: 'user-a' },
      {
        type: 'deposit',
        category: 'salary',
        amount: 100,
        date: clock.todayISO(),
        description: 'Salário',
      }
    );
    expect(result).toMatchObject({ id: 'tx-1', userId: 'user-a', amount: 100 });
  });

  it('converts invalid input into a domain ValidationError', async () => {
    const useCase = new CreateTransaction(
      new InMemoryTransactionRepository(),
      new FakeClock(new Date()),
      new SequentialIdGenerator()
    );
    try {
      await useCase.execute({ userId: 'user-a' }, {});
      throw new Error('Expected invalid input to be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toHaveProperty('issues', expect.any(Array));
    }
  });

  it('updates, gets and deletes an owned transaction', async () => {
    const repository = new InMemoryTransactionRepository([ownedByA]);
    const actor = { userId: 'user-a' };
    expect(
      (
        await new UpdateTransaction(repository).execute(actor, 'tx-a', {
          description: 'Atualizada',
        })
      ).description
    ).toBe('Atualizada');
    expect((await new GetTransaction(repository).execute(actor, 'tx-a')).description).toBe(
      'Atualizada'
    );
    await expect(new DeleteTransaction(repository).execute(actor, 'tx-a')).resolves.toBeUndefined();
    await expect(new GetTransaction(repository).execute(actor, 'tx-a')).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it('lists only the actor transactions and caps page size at 100', async () => {
    const repository = new InMemoryTransactionRepository([
      ownedByA,
      { ...ownedByA, id: 'tx-b', userId: 'user-b' },
    ]);
    const filter = {
      type: 'all' as const,
      dateFrom: '',
      dateTo: '',
      sortBy: 'date' as const,
      sortOrder: 'desc' as const,
      q: '',
      amount_gte: undefined,
      amount_lte: undefined,
      category: [],
    };
    const result = await new ListTransactions(repository).execute({ userId: 'user-a' }, filter, {
      page: 1,
      perPage: 500,
    });
    expect(result.items.map(({ id }) => id)).toEqual(['tx-a']);
    expect(result.perPage).toBe(100);
  });
});
