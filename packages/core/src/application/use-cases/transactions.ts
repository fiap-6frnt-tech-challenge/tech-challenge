import {
  NotFoundError,
  type NewTransaction,
  type Transaction,
  type TransactionFilter,
  type PageRequest,
} from '../../domain';
import { createTransactionSchemaForDate, updateTransactionSchema } from '../../schemas';
import type { Actor, CacheInvalidator, Clock, IdGenerator, TransactionRepository } from '../ports';
import { parseOrThrow } from '../parseOrThrow';
import type { TransactionPatch } from '../types';

export class CreateTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly cache: CacheInvalidator
  ) {}
  async execute(actor: Actor, input: unknown): Promise<Transaction> {
    const data = parseOrThrow<NewTransaction>(
      createTransactionSchemaForDate(this.clock.todayISO()),
      input
    );
    const created = await this.transactions.create({ ...data, id: this.ids.next() }, actor.userId);
    await this.cache.invalidateUser(actor.userId);
    return created;
  }
}

export class UpdateTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly cache: CacheInvalidator
  ) {}
  async execute(actor: Actor, id: string, input: unknown): Promise<Transaction> {
    const patch = parseOrThrow<TransactionPatch>(updateTransactionSchema, input);
    const updated = await this.transactions.update(id, actor.userId, patch);
    if (!updated) throw new NotFoundError('Transação');
    await this.cache.invalidateUser(actor.userId);
    return updated;
  }
}

export class DeleteTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly cache: CacheInvalidator
  ) {}
  async execute(actor: Actor, id: string): Promise<void> {
    if (!(await this.transactions.delete(id, actor.userId))) throw new NotFoundError('Transação');
    await this.cache.invalidateUser(actor.userId);
  }
}

export class GetTransaction {
  constructor(private readonly transactions: TransactionRepository) {}
  async execute(actor: Actor, id: string): Promise<Transaction> {
    const transaction = await this.transactions.findById(id, actor.userId);
    if (!transaction) throw new NotFoundError('Transação');
    return transaction;
  }
}

export class GetTransactionsVersion {
  constructor(private readonly transactions: TransactionRepository) {}
  execute(actor: Actor): Promise<string> {
    return this.transactions.version(actor.userId);
  }
}

export class ListTransactions {
  constructor(private readonly transactions: TransactionRepository) {}
  execute(actor: Actor, filter: TransactionFilter, page: PageRequest) {
    const safePage = {
      page: Math.max(1, Math.floor(page.page)),
      perPage: Math.min(100, Math.max(1, Math.floor(page.perPage))),
    };
    return this.transactions.list(actor.userId, filter, safePage);
  }
}
