import type {
  BalancePoint,
  CategoryAggregate,
  MonthlyAggregate,
  Transaction,
  TransactionFilter,
  PageRequest,
} from '../../domain';
import type {
  AccountOverview,
  DateRange,
  NewTransactionData,
  Page,
  TransactionPatch,
} from '../types';
import type { TransactionRepository } from '../ports';

export class InMemoryTransactionRepository implements TransactionRepository {
  constructor(private readonly items: Transaction[] = []) {}

  async findById(id: string, ownerId: string): Promise<Transaction | null> {
    return this.items.find((item) => item.id === id && item.userId === ownerId) ?? null;
  }
  async all(ownerId: string, range: Partial<DateRange> = {}): Promise<Transaction[]> {
    return this.items
      .filter(
        (item) =>
          item.userId === ownerId &&
          (!range.from || item.date >= range.from) &&
          (!range.to || item.date <= range.to)
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  async list(
    ownerId: string,
    _filter: TransactionFilter,
    page: PageRequest
  ): Promise<Page<Transaction>> {
    const all = this.items.filter((item) => item.userId === ownerId);
    const start = (page.page - 1) * page.perPage;
    return {
      items: all.slice(start, start + page.perPage),
      page: page.page,
      perPage: page.perPage,
      total: all.length,
      totalPages: Math.ceil(all.length / page.perPage),
    };
  }
  async create(data: NewTransactionData, ownerId: string): Promise<Transaction> {
    const item: Transaction = { ...data, userId: ownerId };
    this.items.push(item);
    return item;
  }
  async update(id: string, ownerId: string, patch: TransactionPatch): Promise<Transaction | null> {
    const item = await this.findById(id, ownerId);
    if (!item) return null;
    Object.assign(item, patch);
    return item;
  }
  async delete(id: string, ownerId: string): Promise<boolean> {
    const index = this.items.findIndex((item) => item.id === id && item.userId === ownerId);
    if (index < 0) return false;
    this.items.splice(index, 1);
    return true;
  }
  async overview(ownerId: string, recentLimit: number): Promise<AccountOverview> {
    const items = this.items.filter((item) => item.userId === ownerId);
    const balance = items.reduce(
      (sum, item) =>
        sum +
        (item.type === 'deposit' ? item.amount : item.type === 'withdrawal' ? -item.amount : 0),
      0
    );
    return { balance, recent: items.slice(0, recentLimit) };
  }
  async monthlyTotals(): Promise<MonthlyAggregate[]> {
    return [];
  }
  async categoryTotals(): Promise<CategoryAggregate[]> {
    return [];
  }
  async balanceSeries(): Promise<BalancePoint[]> {
    return [];
  }
}
