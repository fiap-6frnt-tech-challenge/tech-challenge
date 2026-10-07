import {
  NotFoundError,
  type NewTransaction,
  type Transaction,
  type TransactionFilter,
  type PageRequest,
} from '../../domain';
import { createTransactionSchemaForDate, updateTransactionSchema } from '../../schemas';
import type { Actor, Clock, IdGenerator, TransactionRepository } from '../ports';
import { parseOrThrow } from '../parseOrThrow';
import type { TransactionPatch } from '../types';

export class CreateTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator
  ) {}
  execute(actor: Actor, input: unknown): Promise<Transaction> {
    const data = parseOrThrow<NewTransaction>(
      createTransactionSchemaForDate(this.clock.todayISO()),
      input
    );
    return this.transactions.create({ ...data, id: this.ids.next() }, actor.userId);
  }
}

export class UpdateTransaction {
  constructor(private readonly transactions: TransactionRepository) {}
  async execute(actor: Actor, id: string, input: unknown): Promise<Transaction> {
    const patch = parseOrThrow<TransactionPatch>(updateTransactionSchema, input);
    const updated = await this.transactions.update(id, actor.userId, patch);
    if (!updated) throw new NotFoundError('Transação');
    return updated;
  }
}

export class DeleteTransaction {
  constructor(private readonly transactions: TransactionRepository) {}
  async execute(actor: Actor, id: string): Promise<void> {
    if (!(await this.transactions.delete(id, actor.userId))) throw new NotFoundError('Transação');
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
