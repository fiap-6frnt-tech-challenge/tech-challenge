import 'server-only';
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, type SQL } from 'drizzle-orm';
import {
  aggregateByMonth,
  calculateBalance,
  cumulativeBalance,
  groupByCategory,
  type BalancePoint,
  type CategoryAggregate,
  type MonthlyAggregate,
  type PageRequest,
  type Transaction,
  type TransactionFilter,
} from '@bytebank/core';
import type {
  AccountOverview,
  DateRange,
  NewTransactionData,
  Page,
  TransactionPatch,
  TransactionRepository,
} from '@bytebank/core/application';
import type { Database } from '@/db';
import { transactions } from '@/db/schema';
import { toTransaction } from './mappers';

const newestFirst = [desc(transactions.date), desc(transactions.createdAt), desc(transactions.id)];

function owned(id: string, ownerId: string) {
  return and(eq(transactions.id, id), eq(transactions.userId, ownerId));
}

function matching(ownerId: string, filter: TransactionFilter) {
  const conditions: SQL[] = [eq(transactions.userId, ownerId)];
  if (filter.type !== 'all') conditions.push(eq(transactions.type, filter.type));
  if (filter.dateFrom) conditions.push(gte(transactions.date, filter.dateFrom));
  if (filter.dateTo) conditions.push(lte(transactions.date, filter.dateTo));
  if (filter.q) conditions.push(ilike(transactions.description, `%${filter.q}%`));
  if (filter.category.length) conditions.push(inArray(transactions.category, filter.category));
  if (filter.amount_gte !== undefined) conditions.push(gte(transactions.amount, filter.amount_gte));
  if (filter.amount_lte !== undefined) conditions.push(lte(transactions.amount, filter.amount_lte));
  return and(...conditions);
}

function sortedBy(filter: TransactionFilter) {
  const direction = filter.sortOrder === 'asc' ? asc : desc;
  const column = filter.sortBy === 'amount' ? transactions.amount : transactions.date;
  return [direction(column), direction(transactions.createdAt), direction(transactions.id)];
}

export class DrizzleTransactionRepository implements TransactionRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string, ownerId: string): Promise<Transaction | null> {
    const row = await this.db.query.transactions.findFirst({
      where: owned(id, ownerId),
      with: { attachments: true },
    });
    return row ? toTransaction(row) : null;
  }

  async all(ownerId: string, range: Partial<DateRange> = {}): Promise<Transaction[]> {
    const conditions = [eq(transactions.userId, ownerId)];
    if (range.from) conditions.push(gte(transactions.date, range.from));
    if (range.to) conditions.push(lte(transactions.date, range.to));
    const rows = await this.db.query.transactions.findMany({
      where: and(...conditions),
      orderBy: [desc(transactions.date)],
      with: { attachments: true },
    });
    return rows.map((row) => toTransaction(row));
  }

  async list(
    ownerId: string,
    filter: TransactionFilter,
    page: PageRequest
  ): Promise<Page<Transaction>> {
    const where = matching(ownerId, filter);
    const [[{ total }], rows] = await Promise.all([
      this.db.select({ total: count() }).from(transactions).where(where),
      this.db.query.transactions.findMany({
        where,
        orderBy: sortedBy(filter),
        limit: page.perPage,
        offset: (page.page - 1) * page.perPage,
        with: { attachments: true },
      }),
    ]);
    return {
      items: rows.map((row) => toTransaction(row)),
      page: page.page,
      perPage: page.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / page.perPage)),
    };
  }

  async create(data: NewTransactionData, ownerId: string): Promise<Transaction> {
    const [row] = await this.db
      .insert(transactions)
      .values({
        id: data.id,
        userId: ownerId,
        category: data.category,
        type: data.type,
        amount: data.amount,
        date: data.date,
        description: data.description,
      })
      .returning();
    return toTransaction(row);
  }

  async update(id: string, ownerId: string, patch: TransactionPatch): Promise<Transaction | null> {
    const [row] = await this.db
      .update(transactions)
      .set({
        category: patch.category,
        type: patch.type,
        amount: patch.amount,
        date: patch.date,
        description: patch.description,
        updatedAt: new Date(),
      })
      .where(owned(id, ownerId))
      .returning({ id: transactions.id });
    return row ? this.findById(id, ownerId) : null;
  }

  async delete(id: string, ownerId: string): Promise<boolean> {
    const rows = await this.db
      .delete(transactions)
      .where(owned(id, ownerId))
      .returning({ id: transactions.id });
    return rows.length > 0;
  }

  async overview(ownerId: string, recentLimit: number): Promise<AccountOverview> {
    const [all, recent] = await Promise.all([
      this.history(ownerId),
      this.db.query.transactions.findMany({
        where: eq(transactions.userId, ownerId),
        orderBy: newestFirst,
        limit: recentLimit,
        with: { attachments: true },
      }),
    ]);
    return { balance: calculateBalance(all), recent: recent.map((row) => toTransaction(row)) };
  }

  async monthlyTotals(ownerId: string, range: DateRange): Promise<MonthlyAggregate[]> {
    return aggregateByMonth(await this.history(ownerId, range));
  }

  async categoryTotals(ownerId: string, range: DateRange): Promise<CategoryAggregate[]> {
    return groupByCategory(await this.history(ownerId, range));
  }

  async balanceSeries(ownerId: string, range: DateRange): Promise<BalancePoint[]> {
    return cumulativeBalance(await this.history(ownerId, range));
  }

  private async history(ownerId: string, range?: DateRange): Promise<Transaction[]> {
    const conditions = [eq(transactions.userId, ownerId)];
    if (range) {
      conditions.push(gte(transactions.date, range.from), lte(transactions.date, range.to));
    }
    const rows = await this.db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(...newestFirst);
    return rows.map((row) => toTransaction(row));
  }
}
